const prisma = require('../../config/db');
const { sendSuccess, sendPaginated, sendError } = require('../../utils/response');
const { recordAuditLog } = require('../../services/auditService');
const { productSchema } = require('../../validators');

/**
 * List products with pagination, search, category filter, and calculated stock
 */
async function getProducts(req, res, next) {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      categoryId = '',
      status = 'active',
      lowStock = 'false'
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where = {};

    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
        { barcodes: { some: { barcode: { contains: search, mode: 'insensitive' } } } }
      ];
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { name: 'asc' },
        include: {
          category: {
            select: { id: true, name: true }
          },
          barcodes: {
            select: { id: true, barcode: true, type: true, unitsPerBarcode: true }
          },
          batches: {
            where: {
              currentQuantity: { gt: 0 },
              isWriteOff: false
            },
            select: {
              id: true,
              batchNumber: true,
              currentQuantity: true,
              costPrice: true,
              expiryDate: true
            },
            orderBy: [
              { expiryDate: 'asc' },
              { receivedAt: 'asc' }
            ]
          }
        }
      })
    ]);

    // Calculate current stock from batches
    const enrichedProducts = products.map(product => {
      const totalStock = product.batches.reduce((sum, b) => sum + Number(b.currentQuantity), 0);
      const isLowStock = totalStock <= product.reorderLevel;

      // Find earliest upcoming expiry date
      const upcomingExpiry = product.batches
        .filter(b => b.expiryDate)
        .map(b => b.expiryDate)
        .sort((a, b) => new Date(a) - new Date(b))[0] || null;

      return {
        ...product,
        currentStock: totalStock,
        isLowStock,
        earliestExpiry: upcomingExpiry
      };
    });

    const finalResults = lowStock === 'true'
      ? enrichedProducts.filter(p => p.isLowStock)
      : enrichedProducts;

    return sendPaginated(res, finalResults, {
      total: lowStock === 'true' ? finalResults.length : total,
      page,
      limit
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Fast barcode lookup for POS scanner
 */
async function getProductByBarcode(req, res, next) {
  try {
    const { barcode } = req.params;
    if (!barcode) {
      return sendError(res, 'Barcode is required.', 400);
    }

    // Check primary product barcode or secondary aliases
    const product = await prisma.product.findFirst({
      where: {
        isActive: true,
        OR: [
          { barcode: barcode.trim() },
          { barcodes: { some: { barcode: barcode.trim() } } }
        ]
      },
      include: {
        category: { select: { id: true, name: true } },
        batches: {
          where: {
            currentQuantity: { gt: 0 },
            isWriteOff: false
          },
          select: {
            id: true,
            batchNumber: true,
            currentQuantity: true,
            expiryDate: true
          },
          orderBy: [
            { expiryDate: 'asc' },
            { receivedAt: 'asc' }
          ]
        }
      }
    });

    if (!product) {
      return sendError(res, 'No active product found matching this barcode.', 404);
    }

    const totalStock = product.batches.reduce((sum, b) => sum + Number(b.currentQuantity), 0);

    return sendSuccess(res, {
      ...product,
      currentStock: totalStock
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get product by ID
 */
async function getProductById(req, res, next) {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        barcodes: true,
        batches: {
          orderBy: { receivedAt: 'desc' }
        },
        stockMovements: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { fullName: true } }
          }
        }
      }
    });

    if (!product) {
      return sendError(res, 'Product not found.', 404);
    }

    const currentStock = product.batches
      .filter(b => !b.isWriteOff)
      .reduce((sum, b) => sum + Number(b.currentQuantity), 0);

    return sendSuccess(res, {
      ...product,
      currentStock
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Create a new product with optional initial stock and barcodes
 */
async function createProduct(req, res, next) {
  try {
    const data = productSchema.parse(req.body);

    // Check duplicate SKU
    const existingSku = await prisma.product.findUnique({
      where: { sku: data.sku.trim() }
    });
    if (existingSku) {
      return sendError(res, 'A product with this SKU already exists.', 409);
    }

    // Check duplicate primary barcode if provided
    if (data.barcode && data.barcode.trim()) {
      const existingBarcode = await prisma.product.findFirst({
        where: {
          OR: [
            { barcode: data.barcode.trim() },
            { barcodes: { some: { barcode: data.barcode.trim() } } }
          ]
        }
      });
      if (existingBarcode) {
        return sendError(res, 'A product with this barcode already exists.', 409);
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: data.name.trim(),
          sku: data.sku.trim().toUpperCase(),
          barcode: data.barcode ? data.barcode.trim() : null,
          description: data.description ? data.description.trim() : null,
          imageUrl: data.imageUrl ? data.imageUrl.trim() : null,
          categoryId: data.categoryId || null,
          costPrice: data.costPrice,
          sellingPrice: data.sellingPrice,
          wholesalePrice: data.wholesalePrice || null,
          unit: data.unit || 'piece',
          reorderLevel: data.reorderLevel || 10,
          trackExpiry: data.trackExpiry !== undefined ? data.trackExpiry : true,
          isActive: data.isActive !== undefined ? data.isActive : true
        }
      });

      // Handle additional barcodes
      if (Array.isArray(data.barcodes) && data.barcodes.length > 0) {
        for (const extraBarcode of data.barcodes) {
          if (extraBarcode && extraBarcode.trim()) {
            await tx.productBarcode.create({
              data: {
                productId: product.id,
                barcode: extraBarcode.trim(),
                type: 'SECONDARY'
              }
            });
          }
        }
      }

      // Handle optional initial opening stock
      if (data.initialStock && Number(data.initialStock) > 0) {
        const qty = Number(data.initialStock);
        const batchNumber = `BATCH-INIT-${Date.now().toString().slice(-6)}`;
        const batch = await tx.inventoryBatch.create({
          data: {
            batchNumber,
            productId: product.id,
            initialQuantity: qty,
            currentQuantity: qty,
            costPrice: data.costPrice,
            expiryDate: data.expiryDate ? new Date(data.expiryDate) : null
          }
        });

        await tx.stockMovement.create({
          data: {
            productId: product.id,
            batchId: batch.id,
            movementType: 'OPENING_STOCK',
            quantity: qty,
            previousStock: 0,
            newStock: qty,
            reason: 'Initial opening stock upon product creation',
            userId: req.user.id
          }
        });
      }

      return product;
    });

    await recordAuditLog({
      userId: req.user.id,
      action: 'PRODUCT_CREATE',
      entityType: 'Product',
      entityId: result.id,
      details: {
        name: result.name,
        sku: result.sku,
        sellingPrice: result.sellingPrice,
        initialStock: data.initialStock || 0
      },
      req
    });

    return sendSuccess(res, result, 'Product created successfully.', 201);
  } catch (err) {
    next(err);
  }
}

/**
 * Update an existing product
 */
async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const data = productSchema.partial().parse(req.body);

    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });
    if (!existingProduct) {
      return sendError(res, 'Product not found.', 404);
    }

    // Check SKU collision if SKU changed
    if (data.sku && data.sku.trim().toUpperCase() !== existingProduct.sku) {
      const skuCollision = await prisma.product.findUnique({
        where: { sku: data.sku.trim().toUpperCase() }
      });
      if (skuCollision) {
        return sendError(res, 'SKU already in use by another product.', 409);
      }
    }

    // Check barcode collision if barcode changed
    if (data.barcode && data.barcode.trim() !== existingProduct.barcode) {
      const barcodeCollision = await prisma.product.findFirst({
        where: {
          id: { not: id },
          OR: [
            { barcode: data.barcode.trim() },
            { barcodes: { some: { barcode: data.barcode.trim() } } }
          ]
        }
      });
      if (barcodeCollision) {
        return sendError(res, 'Barcode already in use by another product.', 409);
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.sku && { sku: data.sku.trim().toUpperCase() }),
        ...(data.barcode !== undefined && { barcode: data.barcode ? data.barcode.trim() : null }),
        ...(data.description !== undefined && { description: data.description ? data.description.trim() : null }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl ? data.imageUrl.trim() : null }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId || null }),
        ...(data.costPrice !== undefined && { costPrice: data.costPrice }),
        ...(data.sellingPrice !== undefined && { sellingPrice: data.sellingPrice }),
        ...(data.wholesalePrice !== undefined && { wholesalePrice: data.wholesalePrice || null }),
        ...(data.unit && { unit: data.unit }),
        ...(data.reorderLevel !== undefined && { reorderLevel: data.reorderLevel }),
        ...(data.trackExpiry !== undefined && { trackExpiry: data.trackExpiry }),
        ...(data.isActive !== undefined && { isActive: data.isActive })
      }
    });

    await recordAuditLog({
      userId: req.user.id,
      action: 'PRODUCT_UPDATE',
      entityType: 'Product',
      entityId: id,
      details: {
        name: updated.name,
        oldPrice: existingProduct.sellingPrice,
        newPrice: updated.sellingPrice
      },
      req
    });

    return sendSuccess(res, updated, 'Product updated successfully.');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProducts,
  getProductByBarcode,
  getProductById,
  createProduct,
  updateProduct
};
