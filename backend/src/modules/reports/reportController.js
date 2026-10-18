const prisma = require('../../config/db');
const { sendSuccess, sendError } = require('../../utils/response');
const { roundToTwo } = require('../../utils/money');

/**
 * Escape CSV string to prevent CSV formula injection in Excel/Sheets
 */
function sanitizeCsvValue(val) {
  if (val === null || val === undefined) return '';
  let str = String(val).trim();
  // If value begins with =, +, -, @, prefix with a single quote
  if (/^[=+\-@]/.test(str)) {
    str = `'${str}`;
  }
  // Escape double quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Main dashboard & executive sales report
 */
async function getSalesReport(req, res, next) {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0, 0, 0, 0));
    const end = endDate ? new Date(endDate) : new Date(new Date().setHours(23, 59, 59, 999));

    // 1. Completed Sales in range
    const completedSales = await prisma.sale.findMany({
      where: {
        paymentStatus: { in: ['COMPLETED', 'PARTIALLY_REFUNDED'] },
        createdAt: { gte: start, lte: end }
      },
      include: {
        items: true,
        payments: true,
        cashier: { select: { fullName: true } }
      }
    });

    // 2. Refunds in range
    const refunds = await prisma.refund.findMany({
      where: {
        createdAt: { gte: start, lte: end }
      }
    });

    const totalRefundAmount = refunds.reduce((sum, r) => sum + Number(r.totalRefundAmount), 0);

    let totalRevenue = 0;
    let totalCostOfGoods = 0;
    const paymentMethods = { CASH: 0, QR_PAYMENT: 0 };
    const cashierSalesMap = {};

    for (const sale of completedSales) {
      totalRevenue = roundToTwo(totalRevenue + Number(sale.grandTotal));

      // Calculate cost of goods sold from recorded historical costPriceSnapshots
      for (const item of sale.items) {
        const itemCost = Number(item.costPriceSnapshot || 0) * Number(item.quantity);
        totalCostOfGoods = roundToTwo(totalCostOfGoods + itemCost);
      }

      // Payment methods breakdown
      for (const p of sale.payments) {
        if (p.status === 'COMPLETED') {
          paymentMethods[p.method] = roundToTwo((paymentMethods[p.method] || 0) + Number(p.amount));
        }
      }

      // Cashier breakdown
      const cashierName = sale.cashier ? sale.cashier.fullName : 'Unassigned';
      if (!cashierSalesMap[cashierName]) {
        cashierSalesMap[cashierName] = { count: 0, total: 0 };
      }
      cashierSalesMap[cashierName].count += 1;
      cashierSalesMap[cashierName].total = roundToTwo(cashierSalesMap[cashierName].total + Number(sale.grandTotal));
    }

    const netRevenue = roundToTwo(totalRevenue - totalRefundAmount);
    const estimatedGrossProfit = roundToTwo(netRevenue - totalCostOfGoods);

    // 3. Top selling products in range
    const topProducts = await prisma.saleItem.groupBy({
      by: ['productNameSnapshot'],
      where: {
        sale: {
          paymentStatus: { in: ['COMPLETED', 'PARTIALLY_REFUNDED'] },
          createdAt: { gte: start, lte: end }
        }
      },
      _sum: {
        quantity: true,
        lineTotal: true
      },
      orderBy: {
        _sum: {
          lineTotal: 'desc'
        }
      },
      take: 10
    });

    return sendSuccess(res, {
      dateRange: { start, end },
      summary: {
        completedSalesCount: completedSales.length,
        totalRevenue,
        totalRefundAmount,
        netRevenue,
        totalCostOfGoods,
        estimatedGrossProfit
      },
      paymentMethods,
      cashierPerformance: Object.entries(cashierSalesMap).map(([name, data]) => ({
        cashier: name,
        salesCount: data.count,
        totalSales: data.total
      })),
      topSellingProducts: topProducts.map(p => ({
        name: p.productNameSnapshot,
        totalQuantity: Number(p._sum.quantity || 0),
        totalSales: Number(p._sum.lineTotal || 0)
      }))
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Inventory valuation & health report
 */
async function getInventoryReport(req, res, next) {
  try {
    const batches = await prisma.inventoryBatch.findMany({
      where: {
        currentQuantity: { gt: 0 },
        isWriteOff: false
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            unit: true,
            reorderLevel: true,
            sellingPrice: true,
            category: { select: { name: true } }
          }
        }
      }
    });

    let totalInventoryValue = 0;
    let totalRetailValue = 0;
    let totalUnits = 0;

    const productMap = {};

    for (const b of batches) {
      const qty = Number(b.currentQuantity);
      const cost = Number(b.costPrice);
      const retail = Number(b.product.sellingPrice);

      totalUnits += qty;
      totalInventoryValue = roundToTwo(totalInventoryValue + qty * cost);
      totalRetailValue = roundToTwo(totalRetailValue + qty * retail);

      if (!productMap[b.productId]) {
        productMap[b.productId] = {
          name: b.product.name,
          sku: b.product.sku,
          category: b.product.category ? b.product.category.name : 'Uncategorized',
          unit: b.product.unit,
          reorderLevel: b.product.reorderLevel,
          currentStock: 0,
          totalCostValue: 0
        };
      }
      productMap[b.productId].currentStock += qty;
      productMap[b.productId].totalCostValue = roundToTwo(productMap[b.productId].totalCostValue + qty * cost);
    }

    const lowStockItems = Object.values(productMap).filter(
      p => p.currentStock <= p.reorderLevel
    );

    return sendSuccess(res, {
      totalUnits,
      totalInventoryValue,
      totalRetailValue,
      potentialProfit: roundToTwo(totalRetailValue - totalInventoryValue),
      lowStockCount: lowStockItems.length,
      items: Object.values(productMap),
      lowStockItems
    });
  } catch (err) {
    next(err);
  }
}

/**
 * CSV Export for sales or inventory
 */
async function exportSalesReportCsv(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0, 0, 0, 0));
    const end = endDate ? new Date(endDate) : new Date(new Date().setHours(23, 59, 59, 999));

    const sales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: start, lte: end }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        cashier: { select: { fullName: true } },
        payments: { select: { method: true } }
      }
    });

    const headers = ['Sale Number', 'Receipt Number', 'Date', 'Cashier', 'Status', 'Subtotal', 'Discount', 'Tax', 'Grand Total', 'Payment Method'];
    const rows = sales.map(s => [
      sanitizeCsvValue(s.saleNumber),
      sanitizeCsvValue(s.receiptNumber),
      sanitizeCsvValue(new Date(s.createdAt).toLocaleString()),
      sanitizeCsvValue(s.cashier ? s.cashier.fullName : 'N/A'),
      sanitizeCsvValue(s.paymentStatus),
      sanitizeCsvValue(s.subtotal),
      sanitizeCsvValue(s.discountTotal),
      sanitizeCsvValue(s.taxTotal),
      sanitizeCsvValue(s.grandTotal),
      sanitizeCsvValue(s.payments.map(p => p.method).join('; ') || 'N/A')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\r\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=sales-report-${Date.now()}.csv`);
    return res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSalesReport,
  getInventoryReport,
  exportSalesReportCsv
};
