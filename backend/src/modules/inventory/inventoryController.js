const prisma = require('../../config/db');
const { sendSuccess, sendPaginated, sendError } = require('../../utils/response');
const { recordAuditLog } = require('../../services/auditService');
const { stockAdjustmentSchema, writeOffSchema } = require('../../validators');

/**
 * Get inventory summary and alerts
 */
async function getInventorySummary(req, res, next) {
  try {
    // Get expiry threshold setting
    const expirySetting = await prisma.setting.findUnique({
      where: { key: 'EXPIRY_WARNING_DAYS' }
    });
    const warningDays = expirySetting ? Number(expirySetting.value) : 30;

    const now = new Date();
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + warningDays);

    const [totalProducts, lowStockProducts, expiringBatches, expiredBatches] = await Promise.all([
      prisma.product.count({ where: { isActive: true } }),
      // Products where total stock <= reorderLevel
      prisma.$queryRaw`
        SELECT p.id, p.name, p.sku, p."reorderLevel", COALESCE(SUM(b."currentQuantity"), 0)::numeric as "currentStock"
        FROM "Product" p
        LEFT JOIN "InventoryBatch" b ON b."productId" = p.id AND b."isWriteOff" = false
        WHERE p."isActive" = true
        GROUP BY p.id
        HAVING COALESCE(SUM(b."currentQuantity"), 0) <= p."reorderLevel"
      `,
      // Batches expiring within warningDays
      prisma.inventoryBatch.findMany({
        where: {
          currentQuantity: { gt: 0 },
          isWriteOff: false,
          expiryDate: {
            gte: now,
            lte: warningDate
          }
        },
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true } }
        },
        orderBy: { expiryDate: 'asc' }
      }),
      // Already expired batches with remaining stock
      prisma.inventoryBatch.findMany({
        where: {
          currentQuantity: { gt: 0 },
          isWriteOff: false,
          expiryDate: {
            lt: now
          }
        },
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true } }
        },
        orderBy: { expiryDate: 'asc' }
      })
    ]);

    return sendSuccess(res, {
      totalProducts,
      lowStockCount: lowStockProducts.length,
      expiringCount: expiringBatches.length,
      expiredCount: expiredBatches.length,
      warningDays,
      lowStockProducts,
      expiringBatches,
      expiredBatches
    });
  } catch (err) {
    next(err);
  }
}

/**
 * List batches with pagination, product filter, and status
 */
async function getBatches(req, res, next) {
  try {
    const { page = 1, limit = 20, productId = '', status = 'active' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {};
    if (productId) where.productId = productId;
    if (status === 'active') {
      where.currentQuantity = { gt: 0 };
      where.isWriteOff = false;
    } else if (status === 'depleted') {
      where.currentQuantity = { lte: 0 };
    } else if (status === 'written_off') {
      where.isWriteOff = true;
    }

    const [total, batches] = await Promise.all([
      prisma.inventoryBatch.count({ where }),
      prisma.inventoryBatch.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [
          { expiryDate: 'asc' },
          { receivedAt: 'desc' }
        ],
        include: {
          product: {
            select: { id: true, name: true, sku: true, barcode: true, unit: true }
          }
        }
      })
    ]);

    return sendPaginated(res, batches, { total, page, limit });
  } catch (err) {
    next(err);
  }
}

/**
 * List stock movements (audit trail)
 */
async function getStockMovements(req, res, next) {
  try {
    const { page = 1, limit = 25, productId = '', movementType = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {};
    if (productId) where.productId = productId;
    if (movementType) where.movementType = movementType;

    const [total, movements] = await Promise.all([
      prisma.stockMovement.count({ where }),
      prisma.stockMovement.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true } },
          batch: { select: { batchNumber: true, expiryDate: true } },
          user: { select: { id: true, fullName: true, username: true } }
        }
      })
    ]);

    return sendPaginated(res, movements, { total, page, limit });
  } catch (err) {
    next(err);
  }
}

/**
 * Authorized manual stock adjustment
 */
async function adjustStock(req, res, next) {
  try {
    const data = stockAdjustmentSchema.parse(req.body);

    const product = await prisma.product.findUnique({
      where: { id: data.productId },
      include: {
        batches: {
          where: { isWriteOff: false, currentQuantity: { gt: 0 } },
          orderBy: { receivedAt: 'asc' }
        }
      }
    });

    if (!product) {
      return sendError(res, 'Product not found.', 404);
    }

    const currentTotalStock = product.batches.reduce((sum, b) => sum + Number(b.currentQuantity), 0);
    const adjustQty = Number(data.quantity);

    if (data.type === 'ADJUSTMENT_SUBTRACT' && adjustQty > currentTotalStock) {
      return sendError(res, `Cannot subtract ${adjustQty}. Available stock is only ${currentTotalStock}.`, 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      let targetBatch = null;

      if (data.batchId) {
        targetBatch = await tx.inventoryBatch.findUnique({
          where: { id: data.batchId }
        });
        if (!targetBatch) {
          throw new Error('Specified batch does not exist.');
        }
      }

      let newTotalStock = currentTotalStock;

      if (data.type === 'ADJUSTMENT_ADD') {
        newTotalStock = currentTotalStock + adjustQty;

        if (targetBatch) {
          await tx.inventoryBatch.update({
            where: { id: targetBatch.id },
            data: { currentQuantity: { increment: adjustQty } }
          });
        } else {
          // If no batch was specified, check if the product has existing active batches
          // Default to incrementing the latest active batch to avoid creating fragmented ghost batches
          const latestActiveBatch = product.batches && product.batches.length > 0
            ? product.batches[product.batches.length - 1]
            : null;

          if (latestActiveBatch) {
            targetBatch = latestActiveBatch;
            await tx.inventoryBatch.update({
              where: { id: targetBatch.id },
              data: { currentQuantity: { increment: adjustQty } }
            });
          } else {
            // Create a new adjustment batch
            targetBatch = await tx.inventoryBatch.create({
              data: {
                batchNumber: `ADJ-ADD-${Date.now().toString().slice(-6)}`,
                productId: product.id,
                initialQuantity: adjustQty,
                currentQuantity: adjustQty,
                costPrice: product.costPrice,
                expiryDate: data.expiryDate ? new Date(data.expiryDate) : null
              }
            });
          }
        }

        await tx.stockMovement.create({
          data: {
            productId: product.id,
            batchId: targetBatch.id,
            movementType: 'ADJUSTMENT_ADD',
            quantity: adjustQty,
            previousStock: currentTotalStock,
            newStock: newTotalStock,
            reason: data.reason,
            userId: req.user.id
          }
        });
      } else {
        // ADJUSTMENT_SUBTRACT
        newTotalStock = currentTotalStock - adjustQty;

        if (targetBatch) {
          if (Number(targetBatch.currentQuantity) < adjustQty) {
            throw new Error(`Target batch has only ${targetBatch.currentQuantity} units.`);
          }
          await tx.inventoryBatch.update({
            where: { id: targetBatch.id },
            data: { currentQuantity: { decrement: adjustQty } }
          });
        } else {
          // Deduct from batches using FIFO
          let remainingToDeduct = adjustQty;
          for (const batch of product.batches) {
            if (remainingToDeduct <= 0) break;
            const available = Number(batch.currentQuantity);
            const deductFromThis = Math.min(available, remainingToDeduct);

            await tx.inventoryBatch.update({
              where: { id: batch.id },
              data: { currentQuantity: { decrement: deductFromThis } }
            });
            remainingToDeduct -= deductFromThis;
          }
        }

        await tx.stockMovement.create({
          data: {
            productId: product.id,
            batchId: targetBatch ? targetBatch.id : null,
            movementType: 'ADJUSTMENT_SUBTRACT',
            quantity: -adjustQty,
            previousStock: currentTotalStock,
            newStock: newTotalStock,
            reason: data.reason,
            userId: req.user.id
          }
        });
      }

      return { newStock: newTotalStock };
    });

    await recordAuditLog({
      userId: req.user.id,
      action: 'STOCK_ADJUSTMENT',
      entityType: 'Product',
      entityId: product.id,
      details: {
        productName: product.name,
        type: data.type,
        quantity: data.quantity,
        reason: data.reason
      },
      req
    });

    return sendSuccess(res, result, 'Stock adjusted successfully.');
  } catch (err) {
    next(err);
  }
}

/**
 * Write off expired or damaged batch
 */
async function writeOffBatch(req, res, next) {
  try {
    const data = writeOffSchema.parse(req.body);

    const batch = await prisma.inventoryBatch.findUnique({
      where: { id: data.batchId },
      include: {
        product: {
          include: {
            batches: {
              where: { isWriteOff: false, currentQuantity: { gt: 0 } }
            }
          }
        }
      }
    });

    if (!batch) {
      return sendError(res, 'Batch not found.', 404);
    }

    if (batch.isWriteOff) {
      return sendError(res, 'This batch has already been written off.', 400);
    }

    const maxAvailable = Number(batch.currentQuantity);
    if (maxAvailable <= 0) {
      return sendError(res, 'Batch has no remaining stock to write off.', 400);
    }

    const writeOffQuantity = data.quantity ? Number(data.quantity) : maxAvailable;
    if (writeOffQuantity <= 0 || writeOffQuantity > maxAvailable) {
      return sendError(res, `Invalid write-off quantity. Available in this batch is ${maxAvailable}.`, 400);
    }

    const isFullWriteOff = writeOffQuantity >= maxAvailable;
    const previousTotal = batch.product.batches.reduce((sum, b) => sum + Number(b.currentQuantity), 0);
    const newTotal = previousTotal - writeOffQuantity;

    await prisma.$transaction(async (tx) => {
      await tx.inventoryBatch.update({
        where: { id: batch.id },
        data: {
          currentQuantity: { decrement: writeOffQuantity },
          ...(isFullWriteOff && { isWriteOff: true })
        }
      });

      await tx.stockMovement.create({
        data: {
          productId: batch.productId,
          batchId: batch.id,
          movementType: data.type,
          quantity: -writeOffQuantity,
          previousStock: previousTotal,
          newStock: newTotal,
          reason: data.reason,
          userId: req.user.id
        }
      });
    });

    await recordAuditLog({
      userId: req.user.id,
      action: 'BATCH_WRITE_OFF',
      entityType: 'InventoryBatch',
      entityId: batch.id,
      details: {
        productName: batch.product.name,
        batchNumber: batch.batchNumber,
        quantity: writeOffQuantity,
        type: data.type,
        reason: data.reason
      },
      req
    });

    return sendSuccess(res, { writtenOffQuantity: writeOffQuantity }, 'Batch successfully written off.');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getInventorySummary,
  getBatches,
  getStockMovements,
  adjustStock,
  writeOffBatch
};
