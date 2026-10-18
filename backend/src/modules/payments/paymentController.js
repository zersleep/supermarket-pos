const prisma = require('../../config/db');
const { sendSuccess, sendPaginated, sendError } = require('../../utils/response');
const { recordAuditLog } = require('../../services/auditService');

/**
 * List pending payments (QR / E-wallet awaiting manual confirmation)
 */
async function getPendingPayments(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = { status: 'PENDING' };

    const [total, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          sale: {
            include: {
              cashier: { select: { id: true, fullName: true, username: true } },
              customer: { select: { id: true, name: true, phone: true } },
              items: {
                select: {
                  id: true,
                  productNameSnapshot: true,
                  quantity: true,
                  lineTotal: true
                }
              }
            }
          }
        }
      })
    ]);

    return sendPaginated(res, payments, { total, page, limit });
  } catch (err) {
    next(err);
  }
}

/**
 * Authorized manual confirmation of a pending QR payment
 * Atomic check to prevent double confirmation
 */
async function confirmPayment(req, res, next) {
  try {
    const { id } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        sale: {
          include: { items: true }
        }
      }
    });

    if (!payment) {
      return sendError(res, 'Payment record not found.', 404);
    }

    if (payment.status === 'COMPLETED') {
      return sendError(res, 'This payment has already been confirmed.', 400);
    }

    if (payment.status === 'CANCELLED' || payment.status === 'FAILED') {
      return sendError(res, `Cannot confirm payment with status "${payment.status}".`, 400);
    }

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      // Update Payment
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'COMPLETED',
          confirmedByUserId: req.user.id,
          confirmedAt: now
        }
      });

      // Update Sale
      const updatedSale = await tx.sale.update({
        where: { id: payment.saleId },
        data: {
          paymentStatus: 'COMPLETED',
          completedAt: now
        }
      });

      return { payment: updatedPayment, sale: updatedSale };
    });

    await recordAuditLog({
      userId: req.user.id,
      action: 'PAYMENT_CONFIRM',
      entityType: 'Payment',
      entityId: payment.id,
      details: {
        receiptNumber: payment.sale.receiptNumber,
        transactionRef: payment.transactionRef,
        amount: payment.amount,
        confirmedBy: req.user.fullName
      },
      req
    });

    return sendSuccess(res, result, 'Payment verified and confirmed successfully.');
  } catch (err) {
    next(err);
  }
}

/**
 * Cancel a pending payment and release reserved stock safely
 */
async function cancelPendingPayment(req, res, next) {
  try {
    const { id } = req.params;
    const { reason = 'Cancelled by cashier or expired' } = req.body;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        sale: {
          include: {
            items: true
          }
        }
      }
    });

    if (!payment) {
      return sendError(res, 'Payment not found.', 404);
    }

    if (payment.status !== 'PENDING') {
      return sendError(res, `Cannot cancel payment with status "${payment.status}". Only pending payments can be cancelled.`, 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Release reserved stock back to batches
      for (const item of payment.sale.items) {
        if (item.batchId) {
          await tx.inventoryBatch.update({
            where: { id: item.batchId },
            data: {
              currentQuantity: { increment: item.quantity }
            }
          });
        }

        // Get updated total product stock
        const allBatches = await tx.inventoryBatch.findMany({
          where: { productId: item.productId, isWriteOff: false }
        });
        const currentStock = allBatches.reduce((sum, b) => sum + Number(b.currentQuantity), 0);
        const previousStock = currentStock - Number(item.quantity);

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            batchId: item.batchId,
            movementType: 'RETURN_RESTOCK',
            quantity: item.quantity,
            previousStock,
            newStock: currentStock,
            referenceType: 'CANCELLED_SALE',
            referenceId: payment.sale.id,
            reason: `Stock reservation released: ${reason}`,
            userId: req.user.id
          }
        });
      }

      // 2. Mark payment as CANCELLED
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'CANCELLED' }
      });

      // 3. Mark sale as CANCELLED
      const updatedSale = await tx.sale.update({
        where: { id: payment.saleId },
        data: { paymentStatus: 'CANCELLED' }
      });

      return { payment: updatedPayment, sale: updatedSale };
    });

    await recordAuditLog({
      userId: req.user.id,
      action: 'PAYMENT_CANCEL',
      entityType: 'Payment',
      entityId: payment.id,
      details: {
        receiptNumber: payment.sale.receiptNumber,
        reason
      },
      req
    });

    return sendSuccess(res, result, 'Pending payment cancelled and reserved stock restored.');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPendingPayments,
  confirmPayment,
  cancelPendingPayment
};
