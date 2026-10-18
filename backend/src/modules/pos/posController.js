const prisma = require('../../config/db');
const { sendSuccess, sendError } = require('../../utils/response');
const { roundToTwo, convertUsdToKhr } = require('../../utils/money');
const { recordAuditLog } = require('../../services/auditService');
const { checkoutSchema } = require('../../validators');

/**
 * Process POS Checkout (Atomic Transaction with Idempotency, FEFO batch allocation, and negative stock prevention)
 */
async function checkout(req, res, next) {
  try {
    const data = checkoutSchema.parse(req.body);

    // 1. Idempotency Check: prevent duplicate checkout submissions
    const existingSale = await prisma.sale.findUnique({
      where: { idempotencyKey: data.idempotencyKey },
      include: {
        items: true,
        payments: true,
        cashier: { select: { fullName: true } }
      }
    });

    if (existingSale) {
      return sendSuccess(res, existingSale, 'Sale already processed (idempotency key matched).', 200);
    }

    // 2. Verify Cashier Shift if shiftId provided or find active shift for cashier
    let shiftId = data.shiftId || null;
    if (!shiftId) {
      const activeShift = await prisma.cashierShift.findFirst({
        where: {
          cashierId: req.user.id,
          status: 'OPEN'
        }
      });
      if (activeShift) {
        shiftId = activeShift.id;
      }
    }

    // 3. Get Store Currency & Exchange Rate settings
    const [exchangeRateSetting, taxRateSetting] = await Promise.all([
      prisma.setting.findUnique({ where: { key: 'EXCHANGE_RATE_KHR' } }),
      prisma.setting.findUnique({ where: { key: 'TAX_PERCENT' } })
    ]);
    const exchangeRate = exchangeRateSetting ? Number(exchangeRateSetting.value) : 4100;
    const taxPercent = taxRateSetting ? Number(taxRateSetting.value) : 0;

    // 4. Generate Unique Sale and Receipt Numbers
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const saleCount = await prisma.sale.count();
    const saleNumber = `SALE-${dateStr}-${String(saleCount + 1).padStart(5, '0')}`;
    const receiptNumber = `REC-${dateStr}-${String(saleCount + 1).padStart(5, '0')}`;

    // 5. Execute Checkout inside an atomic Database Transaction
    const checkoutResult = await prisma.$transaction(async (tx) => {
      let subtotal = 0;
      let totalDiscount = 0;
      const saleItemsToCreate = [];
      const stockDeductions = [];

      const now = new Date();

      // Validate every item and allocate batches via FEFO (First Expired First Out)
      for (const item of data.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: {
            batches: {
              where: {
                currentQuantity: { gt: 0 },
                isWriteOff: false,
                // Exclude expired batches from being sold!
                OR: [
                  { expiryDate: null },
                  { expiryDate: { gte: now } }
                ]
              },
              orderBy: [
                { expiryDate: 'asc' }, // FEFO: earliest expiry first
                { receivedAt: 'asc' }  // then earliest received
              ]
            }
          }
        });

        if (!product) {
          throw new Error(`Product with ID ${item.productId} was not found.`);
        }

        if (!product.isActive) {
          throw new Error(`Product "${product.name}" is inactive and cannot be sold.`);
        }

        const requestedQty = Number(item.quantity);
        const availableStock = product.batches.reduce((sum, b) => sum + Number(b.currentQuantity), 0);

        if (availableStock < requestedQty) {
          throw new Error(
            `Insufficient stock for "${product.name}". Requested: ${requestedQty}, Available (non-expired): ${availableStock}.`
          );
        }

        // Calculate authoritative backend prices
        const unitPrice = Number(product.sellingPrice);
        const itemDiscount = Number(item.discount || 0);
        const itemSubtotal = roundToTwo(unitPrice * requestedQty);
        const lineTotal = Math.max(0, roundToTwo(itemSubtotal - itemDiscount));

        subtotal = roundToTwo(subtotal + itemSubtotal);
        totalDiscount = roundToTwo(totalDiscount + itemDiscount);

        // FEFO batch allocation: allocate quantity across available batches
        let remainingQtyToAllocate = requestedQty;

        for (const batch of product.batches) {
          if (remainingQtyToAllocate <= 0) break;

          const batchAvail = Number(batch.currentQuantity);
          const allocatedQty = Math.min(batchAvail, remainingQtyToAllocate);

          saleItemsToCreate.push({
            productId: product.id,
            batchId: batch.id,
            productNameSnapshot: product.name,
            skuSnapshot: product.sku,
            unitPriceSnapshot: unitPrice,
            costPriceSnapshot: Number(batch.costPrice || product.costPrice),
            quantity: allocatedQty,
            discountAmount: roundToTwo(itemDiscount * (allocatedQty / requestedQty)),
            lineTotal: roundToTwo(lineTotal * (allocatedQty / requestedQty))
          });

          stockDeductions.push({
            productId: product.id,
            batchId: batch.id,
            deductQty: allocatedQty,
            productName: product.name
          });

          remainingQtyToAllocate -= allocatedQty;
        }

        if (remainingQtyToAllocate > 0) {
          throw new Error(`Could not allocate full quantity for "${product.name}".`);
        }
      }

      // Calculate tax and grand total
      const taxTotal = roundToTwo(subtotal * (taxPercent / 100));
      const grandTotal = Math.max(0, roundToTwo(subtotal - totalDiscount + taxTotal));

      // Payment validation
      const isCash = data.paymentMethod === 'CASH';
      let cashReceived = 0;
      let changeGiven = 0;

      if (isCash) {
        cashReceived = Number(data.cashReceived || 0);
        if (data.currency === 'KHR') {
          const grandTotalKhr = convertUsdToKhr(grandTotal, exchangeRate);
          if (cashReceived < grandTotalKhr) {
            throw new Error(`Insufficient cash received. Required: ${grandTotalKhr.toLocaleString()} KHR, Received: ${cashReceived.toLocaleString()} KHR.`);
          }
          const changeKhr = cashReceived - grandTotalKhr;
          changeGiven = changeKhr;
        } else {
          // USD
          if (cashReceived < grandTotal) {
            throw new Error(`Insufficient cash received. Required: $${grandTotal.toFixed(2)}, Received: $${cashReceived.toFixed(2)}.`);
          }
          changeGiven = roundToTwo(cashReceived - grandTotal);
        }
      }

      const initialSaleStatus = isCash ? 'COMPLETED' : 'PENDING';
      const initialPaymentStatus = isCash ? 'COMPLETED' : 'PENDING';

      // 6. Create Sale Header
      const sale = await tx.sale.create({
        data: {
          saleNumber,
          receiptNumber,
          cashierId: req.user.id,
          shiftId,
          customerId: data.customerId || null,
          subtotal,
          discountTotal: totalDiscount,
          taxTotal,
          grandTotal,
          paymentStatus: initialSaleStatus,
          idempotencyKey: data.idempotencyKey,
          notes: data.notes || null,
          completedAt: isCash ? now : null
        }
      });

      // 7. Create Sale Items
      for (const itemData of saleItemsToCreate) {
        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            ...itemData
          }
        });
      }

      // 8. Deduct Inventory Batches and record StockMovements atomically
      for (const deduct of stockDeductions) {
        const batch = await tx.inventoryBatch.update({
          where: { id: deduct.batchId },
          data: {
            currentQuantity: { decrement: deduct.deductQty }
          }
        });

        // Get updated total stock for product
        const allBatches = await tx.inventoryBatch.findMany({
          where: { productId: deduct.productId, isWriteOff: false }
        });
        const newTotalStock = allBatches.reduce((sum, b) => sum + Number(b.currentQuantity), 0);
        const previousStock = newTotalStock + deduct.deductQty;

        await tx.stockMovement.create({
          data: {
            productId: deduct.productId,
            batchId: deduct.batchId,
            movementType: 'SALE',
            quantity: -deduct.deductQty,
            previousStock,
            newStock: newTotalStock,
            referenceType: 'SALE',
            referenceId: sale.id,
            reason: `Sale ${sale.receiptNumber}`,
            userId: req.user.id
          }
        });
      }

      // 9. Create Payment Record
      const paymentRef = `PAY-${dateStr}-${String(Date.now()).slice(-6)}`;
      const qrData = data.paymentMethod === 'QR_PAYMENT'
        ? JSON.stringify({
            store: 'Supermarket POS',
            saleNumber: sale.saleNumber,
            receiptNumber: sale.receiptNumber,
            amount: grandTotal,
            currency: data.currency,
            amountKhr: convertUsdToKhr(grandTotal, exchangeRate),
            ref: paymentRef,
            generatedAt: now.toISOString(),
            isSimulated: true
          })
        : null;

      const payment = await tx.payment.create({
        data: {
          saleId: sale.id,
          method: data.paymentMethod,
          amount: grandTotal,
          currency: data.currency,
          status: initialPaymentStatus,
          transactionRef: paymentRef,
          qrCodeData: qrData,
          cashReceived: isCash ? cashReceived : null,
          changeGiven: isCash ? changeGiven : null,
          confirmedByUserId: isCash ? req.user.id : null,
          confirmedAt: isCash ? now : null
        }
      });

      // 10. Update Cashier Shift if cash sale and shift is open
      if (isCash && shiftId) {
        await tx.cashierShift.update({
          where: { id: shiftId },
          data: {
            cashSalesTotal: { increment: grandTotal },
            expectedClosingCash: { increment: grandTotal }
          }
        });
      }

      return {
        sale: {
          ...sale,
          items: saleItemsToCreate,
          payments: [payment]
        },
        changeGiven,
        qrCodeData: qrData,
        exchangeRate
      };
    });

    await recordAuditLog({
      userId: req.user.id,
      action: checkoutResult.sale.paymentStatus === 'COMPLETED' ? 'SALE_COMPLETED' : 'SALE_CREATED_PENDING',
      entityType: 'Sale',
      entityId: checkoutResult.sale.id,
      details: {
        receiptNumber: checkoutResult.sale.receiptNumber,
        grandTotal: checkoutResult.sale.grandTotal,
        paymentMethod: data.paymentMethod,
        itemsCount: data.items.length
      },
      req
    });

    return sendSuccess(res, checkoutResult, 'Checkout processed successfully.', 201);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  checkout
};
