const prisma = require('../../config/db');
const { sendSuccess, sendPaginated, sendError } = require('../../utils/response');
const { roundToTwo } = require('../../utils/money');
const { recordAuditLog } = require('../../services/auditService');
const { purchaseOrderSchema, goodsReceiptSchema } = require('../../validators');

/**
 * List purchase orders
 */
async function getPurchaseOrders(req, res, next) {
  try {
    const { page = 1, limit = 20, status = '', supplierId = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {};
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;

    const [total, orders] = await Promise.all([
      prisma.purchaseOrder.count({ where }),
      prisma.purchaseOrder.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: { select: { id: true, name: true } },
          createdByUser: { select: { id: true, fullName: true } },
          _count: { select: { items: true, receipts: true } }
        }
      })
    ]);

    return sendPaginated(res, orders, { total, page, limit });
  } catch (err) {
    next(err);
  }
}

/**
 * Get purchase order details
 */
async function getPOById(req, res, next) {
  try {
    const { id } = req.params;
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        createdByUser: { select: { id: true, fullName: true, username: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, unit: true, trackExpiry: true } }
          }
        },
        receipts: {
          orderBy: { receivedAt: 'desc' },
          include: {
            receivedByUser: { select: { fullName: true } },
            items: {
              include: {
                product: { select: { name: true, sku: true } }
              }
            }
          }
        }
      }
    });

    if (!po) {
      return sendError(res, 'Purchase order not found.', 404);
    }

    return sendSuccess(res, po);
  } catch (err) {
    next(err);
  }
}

/**
 * Create a new purchase order
 */
async function createPurchaseOrder(req, res, next) {
  try {
    const data = purchaseOrderSchema.parse(req.body);

    const supplier = await prisma.supplier.findUnique({
      where: { id: data.supplierId }
    });
    if (!supplier) {
      return sendError(res, 'Supplier not found.', 404);
    }

    // Generate PO Number: PO-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await prisma.purchaseOrder.count();
    const poNumber = `PO-${dateStr}-${String(count + 1).padStart(4, '0')}`;

    let totalCost = 0;
    const itemsData = data.items.map(item => {
      const lineTotal = roundToTwo(item.quantityOrdered * item.unitCost);
      totalCost = roundToTwo(totalCost + lineTotal);
      return {
        productId: item.productId,
        quantityOrdered: item.quantityOrdered,
        unitCost: item.unitCost,
        lineTotal
      };
    });

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: data.supplierId,
        status: 'DRAFT',
        expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
        totalCost,
        notes: data.notes || null,
        createdByUserId: req.user.id,
        items: {
          create: itemsData
        }
      },
      include: {
        supplier: { select: { name: true } },
        items: true
      }
    });

    await recordAuditLog({
      userId: req.user.id,
      action: 'PO_CREATE',
      entityType: 'PurchaseOrder',
      entityId: po.id,
      details: { poNumber, supplierName: supplier.name, totalCost },
      req
    });

    return sendSuccess(res, po, 'Purchase order created in Draft status.', 201);
  } catch (err) {
    next(err);
  }
}

/**
 * Update purchase order status
 */
async function updatePOStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['DRAFT', 'SUBMITTED', 'APPROVED', 'CANCELLED'];
    if (!allowedStatuses.includes(status)) {
      return sendError(res, `Invalid status. Must be one of: ${allowedStatuses.join(', ')}`, 400);
    }

    const po = await prisma.purchaseOrder.findUnique({
      where: { id }
    });
    if (!po) {
      return sendError(res, 'Purchase order not found.', 404);
    }

    if (po.status === 'FULLY_RECEIVED' || po.status === 'PARTIALLY_RECEIVED') {
      return sendError(res, 'Cannot change status of a purchase order that has already received goods.', 400);
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { status }
    });

    await recordAuditLog({
      userId: req.user.id,
      action: 'PO_STATUS_CHANGE',
      entityType: 'PurchaseOrder',
      entityId: id,
      details: { oldStatus: po.status, newStatus: status, poNumber: po.poNumber },
      req
    });

    return sendSuccess(res, updated, `Purchase order status updated to ${status}.`);
  } catch (err) {
    next(err);
  }
}

/**
 * Goods Receiving: Atomic transaction that updates PO, creates batches, and records stock movements
 */
async function receiveGoods(req, res, next) {
  try {
    const data = goodsReceiptSchema.parse(req.body);

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: data.poId },
      include: {
        items: true
      }
    });

    if (!po) {
      return sendError(res, 'Purchase order not found.', 404);
    }

    if (po.status !== 'APPROVED' && po.status !== 'PARTIALLY_RECEIVED') {
      return sendError(res, `Cannot receive goods for a purchase order in ${po.status} status. It must be Approved first.`, 400);
    }

    // Generate unique Receipt Number: GRN-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const grnCount = await prisma.goodsReceipt.count();
    const receiptNumber = `GRN-${dateStr}-${String(grnCount + 1).padStart(4, '0')}`;

    const receiptResult = await prisma.$transaction(async (tx) => {
      // Create GoodsReceipt header
      const receipt = await tx.goodsReceipt.create({
        data: {
          receiptNumber,
          poId: po.id,
          receivedByUserId: req.user.id,
          notes: data.notes || null
        }
      });

      // Process each received item
      for (const item of data.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: {
            batches: {
              where: { isWriteOff: false }
            }
          }
        });

        if (!product) {
          throw new Error(`Product with ID ${item.productId} not found.`);
        }

        const qtyReceived = Number(item.quantityReceived);
        const currentTotalStock = product.batches.reduce((sum, b) => sum + Number(b.currentQuantity), 0);
        const newTotalStock = currentTotalStock + qtyReceived;

        // Create inventory batch for the received goods
        const batch = await tx.inventoryBatch.create({
          data: {
            batchNumber: item.batchNumber.trim(),
            productId: product.id,
            initialQuantity: qtyReceived,
            currentQuantity: qtyReceived,
            costPrice: item.unitCost,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null
          }
        });

        // Record stock movement
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            batchId: batch.id,
            movementType: 'RECEIPT',
            quantity: qtyReceived,
            previousStock: currentTotalStock,
            newStock: newTotalStock,
            referenceType: 'RECEIPT',
            referenceId: receipt.id,
            reason: `Goods receipt from PO ${po.poNumber}`,
            userId: req.user.id
          }
        });

        // Create receipt item
        await tx.goodsReceiptItem.create({
          data: {
            receiptId: receipt.id,
            poItemId: item.poItemId || null,
            productId: product.id,
            batchId: batch.id,
            quantityReceived: qtyReceived,
            unitCost: item.unitCost,
            batchNumber: item.batchNumber.trim(),
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null
          }
        });

        // Update purchase order item if referenced
        if (item.poItemId) {
          await tx.purchaseOrderItem.update({
            where: { id: item.poItemId },
            data: {
              quantityReceived: { increment: qtyReceived }
            }
          });
        }
      }

      // Check overall PO completion status
      const updatedPoItems = await tx.purchaseOrderItem.findMany({
        where: { poId: po.id }
      });

      const allFullyReceived = updatedPoItems.every(
        i => Number(i.quantityReceived) >= Number(i.quantityOrdered)
      );

      const newPoStatus = allFullyReceived ? 'FULLY_RECEIVED' : 'PARTIALLY_RECEIVED';

      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status: newPoStatus }
      });

      return { receipt, newPoStatus };
    });

    await recordAuditLog({
      userId: req.user.id,
      action: 'GOODS_RECEIPT',
      entityType: 'GoodsReceipt',
      entityId: receiptResult.receipt.id,
      details: {
        receiptNumber,
        poNumber: po.poNumber,
        itemsCount: data.items.length,
        newPoStatus: receiptResult.newPoStatus
      },
      req
    });

    return sendSuccess(res, receiptResult, 'Goods received and inventory updated successfully.', 201);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPurchaseOrders,
  getPOById,
  createPurchaseOrder,
  updatePOStatus,
  receiveGoods
};
