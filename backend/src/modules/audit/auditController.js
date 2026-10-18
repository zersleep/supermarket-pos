const prisma = require('../../config/db');
const { sendPaginated } = require('../../utils/response');

async function getAuditLogs(req, res, next) {
  try {
    const { page = 1, limit = 25, action = '', entityType = '', userId = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {};
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (userId) where.userId = userId;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullName: true, username: true, role: true } }
        }
      })
    ]);

    return sendPaginated(res, logs, { total, page, limit });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAuditLogs
};
