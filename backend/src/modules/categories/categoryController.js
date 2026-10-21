const prisma = require('../../config/db');
const { sendSuccess, sendError } = require('../../utils/response');
const { recordAuditLog } = require('../../services/auditService');
const { categorySchema } = require('../../validators');

/**
 * List categories with product counts
 */
async function getCategories(req, res, next) {
  try {
    const { includeInactive } = req.query;
    const where = {};
    if (includeInactive !== 'true') {
      where.isActive = true;
    }

    const categories = await prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    return sendSuccess(res, categories);
  } catch (err) {
    next(err);
  }
}

/**
 * Create a new category
 */
async function createCategory(req, res, next) {
  try {
    const data = categorySchema.parse(req.body);

    const existing = await prisma.category.findUnique({
      where: { name: data.name }
    });
    if (existing) {
      return sendError(res, 'A category with this name already exists.', 409);
    }

    const category = await prisma.category.create({
      data: {
        name: data.name,
        description: data.description || null,
        isActive: data.isActive !== undefined ? data.isActive : true
      }
    });

    await recordAuditLog({
      userId: req.user.id,
      action: 'CATEGORY_CREATE',
      entityType: 'Category',
      entityId: category.id,
      details: { name: category.name },
      req
    });

    return sendSuccess(res, category, 'Category created successfully.', 201);
  } catch (err) {
    next(err);
  }
}

/**
 * Update a category
 */
async function updateCategory(req, res, next) {
  try {
    const { id } = req.params;
    const data = categorySchema.parse(req.body);

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description || null,
        isActive: data.isActive !== undefined ? data.isActive : true
      }
    });

    await recordAuditLog({
      userId: req.user.id,
      action: 'CATEGORY_UPDATE',
      entityType: 'Category',
      entityId: category.id,
      details: { name: category.name },
      req
    });

    return sendSuccess(res, category, 'Category updated successfully.');
  } catch (err) {
    next(err);
  }
}

/**
 * Delete a category
 */
async function deleteCategory(req, res, next) {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    if (!category) {
      return sendError(res, 'Category not found.', 404);
    }

    // Safely unassign any linked products to null before removing category
    if (category._count.products > 0) {
      await prisma.product.updateMany({
        where: { categoryId: id },
        data: { categoryId: null }
      });
    }

    await prisma.category.delete({
      where: { id }
    });

    await recordAuditLog({
      userId: req.user.id,
      action: 'CATEGORY_DELETE',
      entityType: 'Category',
      entityId: id,
      details: {
        name: category.name,
        unassignedProductsCount: category._count.products
      },
      req
    });

    return sendSuccess(res, null, `Category "${category.name}" deleted successfully.`);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
