const prisma = require('../../config/db');
const { sendSuccess, sendPaginated, sendError } = require('../../utils/response');
const { recordAuditLog } = require('../../services/auditService');
const { supplierSchema } = require('../../validators');

async function getSuppliers(req, res, next) {
  try {
    const { page = 1, limit = 20, search = '', status = 'active' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {};
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [total, suppliers] = await Promise.all([
      prisma.supplier.count({ where }),
      prisma.supplier.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { purchaseOrders: true } }
        }
      })
    ]);

    return sendPaginated(res, suppliers, { total, page, limit });
  } catch (err) {
    next(err);
  }
}

async function getSupplierById(req, res, next) {
  try {
    const { id } = req.params;
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        purchaseOrders: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!supplier) {
      return sendError(res, 'Supplier not found.', 404);
    }

    return sendSuccess(res, supplier);
  } catch (err) {
    next(err);
  }
}

async function createSupplier(req, res, next) {
  try {
    const data = supplierSchema.parse(req.body);

    const existing = await prisma.supplier.findUnique({
      where: { name: data.name.trim() }
    });
    if (existing) {
      return sendError(res, 'A supplier with this name already exists.', 409);
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: data.name.trim(),
        contactPerson: data.contactPerson ? data.contactPerson.trim() : null,
        phone: data.phone ? data.phone.trim() : null,
        email: data.email ? data.email.trim() : null,
        address: data.address ? data.address.trim() : null,
        notes: data.notes ? data.notes.trim() : null,
        isActive: data.isActive !== undefined ? data.isActive : true
      }
    });

    await recordAuditLog({
      userId: req.user.id,
      action: 'SUPPLIER_CREATE',
      entityType: 'Supplier',
      entityId: supplier.id,
      details: { name: supplier.name },
      req
    });

    return sendSuccess(res, supplier, 'Supplier created successfully.', 201);
  } catch (err) {
    next(err);
  }
}

async function updateSupplier(req, res, next) {
  try {
    const { id } = req.params;
    const data = supplierSchema.partial().parse(req.body);

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.contactPerson !== undefined && { contactPerson: data.contactPerson }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.isActive !== undefined && { isActive: data.isActive })
      }
    });

    await recordAuditLog({
      userId: req.user.id,
      action: 'SUPPLIER_UPDATE',
      entityType: 'Supplier',
      entityId: id,
      details: { name: supplier.name },
      req
    });

    return sendSuccess(res, supplier, 'Supplier updated successfully.');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier
};
