const prisma = require('../../config/db');
const { sendSuccess, sendPaginated, sendError } = require('../../utils/response');
const { roundToTwo } = require('../../utils/money');
const { recordAuditLog } = require('../../services/auditService');
const { createRefundSchema } = require('../../validators');

/**
 * List sales history with date and status filters
 */
async function getSales(req, res, next) {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status = '',
      cashierId = '',
      startDate = '',
      endDate = ''
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where = {};

    if (status) where.paymentStatus = status;
    if (cashierId) where.cashierId = cashierId;

    if (search) {
      where.OR = [
        { saleNumber: { contains: search, mode: 'insensitive' } },
        { receiptNumber: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [total, sales] = await Promise.all([
      prisma.sale.count({ where }),
      prisma.sale.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          cashier: { select: { id: true, fullName: true, username: true } },
          customer: { select: { id: true, name: true, phone: true } },
          payments: { select: { method: true, status: true, amount: true, currency: true } },
          _count: { select: { items: true, refunds: true } }
        }
      })
    ]);

    return sendPaginated(res, sales, { total, page, limit });
  } catch (err) {
    next(err);
  }
}

/**
 * Get sale / receipt details by ID or Receipt Number
 */
async function getSaleById(req, res, next) {
  try {
    const { id } = req.params;

    const sale = await prisma.sale.findFirst({
      where: {
        OR: [
          { id },
          { receiptNumber: id },
          { saleNumber: id }
        ]
      },
      include: {
        cashier: { select: { id: true, fullName: true, username: true } },
        customer: true,
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, unit: true } },
            refundItems: true
          }
        },
        payments: {
          include: {
            confirmedByUser: { select: { fullName: true } }
          }
        },
        refunds: {
          include: {
            processedByUser: { select: { fullName: true } },
            items: true
          }
        }
      }
    });

    if (!sale) {
      return sendError(res, 'Sale record not found.', 404);
    }

    // Fetch store settings for receipt layout
    const settings = await prisma.setting.findMany();
    const settingsMap = settings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});

    return sendSuccess(res, {
      sale,
      storeInfo: {
        storeName: settingsMap.STORE_NAME || 'Metro Supermarket',
        storeAddress: settingsMap.STORE_ADDRESS || '123 Main Blvd',
        storePhone: settingsMap.STORE_PHONE || '+855 23 999 888',
        receiptHeader: settingsMap.RECEIPT_HEADER || 'Thank you for shopping with us!',
        receiptFooter: settingsMap.RECEIPT_FOOTER || 'Goods sold are returnable within 7 days with receipt.',
        exchangeRateKHR: settingsMap.EXCHANGE_RATE_KHR || '4100'
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Process an authorized Return and Refund
 */
async function processRefund(req, res, next) {
  try {
    const data = createRefundSchema.parse(req.body);

    const sale = await prisma.sale.findUnique({
      where: { id: data.saleId },
      include: {
        items: {
          include: {
            refundItems: true
          }
        },
        refunds: true
      }
    });

    if (!sale) {
      return sendError(res, 'Original sale not found.', 404);
    }

    if (sale.paymentStatus !== 'COMPLETED' && sale.paymentStatus !== 'PARTIALLY_REFUNDED') {
      return sendError(res, `Cannot refund a sale with status "${sale.paymentStatus}". Only completed sales can be refunded.`, 400);
    }

    // Generate refund number: REF-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const refundCount = await prisma.refund.count();
    const refundNumber = `REF-${dateStr}-${String(refundCount + 1).padStart(4, '0')}`;

    const refundResult = await prisma.$transaction(async (tx) => {
      let totalRefundAmount = 0;
      const refundItemsToCreate = [];

      for (const item of data.items) {
        const saleItem = sale.items.find(si => si.id === item.saleItemId);
        if (!saleItem) {
          throw new Error(`Sale item with ID ${item.saleItemId} not found in this sale.`);
        }

        // Calculate already refunded quantity
        const alreadyRefundedQty = saleItem.refundItems.reduce((sum, ri) => sum + Number(ri.quantity), 0);
        const maxRefundableQty = Number(saleItem.quantity) - alreadyRefundedQty;

        if (Number(item.quantity) > maxRefundableQty) {
          throw new Error(
            `Cannot refund ${item.quantity} of "${saleItem.productNameSnapshot}". Maximum refundable: ${maxRefundableQty}.`
          );
        }

        totalRefundAmount = roundToTwo(totalRefundAmount + Number(item.refundAmount));

        // Restocking logic: only restock if requested AND condition is GOOD
        const shouldRestock = item.restock === true && item.condition === 'GOOD';

        if (shouldRestock && saleItem.batchId) {
          await tx.inventoryBatch.update({
            where: { id: saleItem.batchId },
            data: { currentQuantity: { increment: item.quantity } }
          });

          // Stock movement
          const allBatches = await tx.inventoryBatch.findMany({
            where: { productId: saleItem.productId, isWriteOff: false }
          });
          const newStock = allBatches.reduce((sum, b) => sum + Number(b.currentQuantity), 0);
          const prevStock = newStock - Number(item.quantity);

          await tx.stockMovement.create({
            data: {
              productId: saleItem.productId,
              batchId: saleItem.batchId,
              movementType: 'RETURN_RESTOCK',
              quantity: item.quantity,
              previousStock: prevStock,
              newStock,
              referenceType: 'REFUND',
              referenceId: sale.id,
              reason: `Restocked return from sale ${sale.receiptNumber}: ${data.reason}`,
              userId: req.user.id
            }
          });
        }

        refundItemsToCreate.push({
          saleItemId: saleItem.id,
          quantity: item.quantity,
          refundAmount: item.refundAmount,
          restocked: shouldRestock,
          restockCondition: item.condition || null
        });
      }

      // Create Refund record
      const refund = await tx.refund.create({
        data: {
          refundNumber,
          originalSaleId: sale.id,
          processedByUserId: req.user.id,
          totalRefundAmount,
          reason: data.reason,
          items: {
            create: refundItemsToCreate
          }
        },
        include: { items: true }
      });

      // Update sale paymentStatus: check if full or partial refund
      const previousRefundsTotal = sale.refunds.reduce((sum, r) => sum + Number(r.totalRefundAmount), 0);
      const allRefundsTotal = roundToTwo(previousRefundsTotal + totalRefundAmount);

      const isFullRefund = allRefundsTotal >= Number(sale.grandTotal);
      const newSaleStatus = isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED';

      await tx.sale.update({
        where: { id: sale.id },
        data: { paymentStatus: newSaleStatus }
      });

      return { refund, newSaleStatus };
    });

    await recordAuditLog({
      userId: req.user.id,
      action: 'SALE_REFUND',
      entityType: 'Refund',
      entityId: refundResult.refund.id,
      details: {
        refundNumber,
        originalReceiptNumber: sale.receiptNumber,
        refundAmount: refundResult.refund.totalRefundAmount,
        newSaleStatus: refundResult.newSaleStatus,
        reason: data.reason
      },
      req
    });

    return sendSuccess(res, refundResult, 'Refund processed successfully.', 201);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSales,
  getSaleById,
  processRefund
};
