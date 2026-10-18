const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const config = require('../config/env');
const { sendError } = require('../utils/response');

async function authenticateToken(req, res, next) {
  try {
    let token = null;

    // Check Authorization header: Bearer <token>
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.pos_token) {
      token = req.cookies.pos_token;
    }

    if (!token) {
      return sendError(res, 'Authentication required. Please log in.', 401);
    }

    const decoded = jwt.verify(token, config.jwtSecret);

    // Fetch user from DB to ensure user is still active and valid
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    if (!user) {
      return sendError(res, 'User account no longer exists.', 401);
    }

    if (!user.isActive) {
      return sendError(res, 'Account is deactivated. Contact an administrator.', 403);
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return sendError(res, 'Session has expired. Please sign in again.', 401);
    }
    return sendError(res, 'Invalid authentication token.', 401);
  }
}

/**
 * Higher-order middleware to restrict endpoints to specific roles
 * @param  {...string} allowedRoles 
 */
function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Authentication required.', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        'Forbidden: You do not have permission to perform this action.',
        403
      );
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  requireRoles
};
