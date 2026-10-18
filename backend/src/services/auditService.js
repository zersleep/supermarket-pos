const prisma = require('../config/db');

/**
 * Record an audit event
 * @param {Object} params
 * @param {string} [params.userId] - ID of the user performing the action
 * @param {string} params.action - Action name (e.g. "AUTH_LOGIN", "STOCK_ADJUSTMENT")
 * @param {string} params.entityType - Target entity type ("User", "Product", "Sale", etc.)
 * @param {string} [params.entityId] - ID of the target record
 * @param {Object} [params.details] - Before/after or contextual data (secrets excluded)
 * @param {Object} [params.req] - Express request object for IP and User-Agent
 */
async function recordAuditLog({ userId, action, entityType, entityId, details, req }) {
  try {
    let ipAddress = null;
    let userAgent = null;

    if (req) {
      ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
      userAgent = req.headers['user-agent'] || null;
    }

    // Sanitize details to never record passwords or secrets
    let sanitizedDetails = details;
    if (details && typeof details === 'object') {
      sanitizedDetails = { ...details };
      delete sanitizedDetails.password;
      delete sanitizedDetails.passwordHash;
      delete sanitizedDetails.token;
      delete sanitizedDetails.jwtSecret;
    }

    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        entityType,
        entityId: entityId ? String(entityId) : null,
        details: sanitizedDetails || {},
        ipAddress: ipAddress ? String(ipAddress).substring(0, 45) : null,
        userAgent: userAgent ? String(userAgent).substring(0, 255) : null
      }
    });
  } catch (err) {
    // Non-blocking error logging for audit logs so main business transaction is not disrupted
    console.error('AuditLog Error:', err.message);
  }
}

module.exports = {
  recordAuditLog
};
