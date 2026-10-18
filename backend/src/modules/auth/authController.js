const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/db');
const config = require('../../config/env');
const { ROLES, DEFAULT_SETTINGS } = require('../../config/constants');
const { sendSuccess, sendError } = require('../../utils/response');
const { recordAuditLog } = require('../../services/auditService');
const { setupSchema, loginSchema } = require('../../validators');

/**
 * Check if the system has been initialized with an Owner
 */
async function checkSystemStatus(req, res, next) {
  try {
    const ownerCount = await prisma.user.count({
      where: { role: ROLES.OWNER }
    });
    return sendSuccess(res, { initialized: ownerCount > 0 });
  } catch (err) {
    next(err);
  }
}

/**
 * One-time initial setup to create the system Owner
 */
async function setupOwner(req, res, next) {
  try {
    const data = setupSchema.parse(req.body);

    // Verify setup secret
    if (data.setupSecret !== config.setupSecret) {
      return sendError(res, 'Invalid setup secret key.', 403);
    }

    // Check if an owner already exists
    const existingOwner = await prisma.user.findFirst({
      where: { role: ROLES.OWNER }
    });

    if (existingOwner) {
      return sendError(res, 'System has already been initialized. Setup is closed.', 400);
    }

    // Hash password securely
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(data.password, salt);

    // Create Owner user and default settings in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const newOwner = await tx.user.create({
        data: {
          username: data.username.toLowerCase(),
          passwordHash,
          fullName: data.fullName,
          email: data.email || null,
          phone: data.phone || null,
          role: ROLES.OWNER,
          isActive: true
        },
        select: {
          id: true,
          username: true,
          fullName: true,
          email: true,
          role: true
        }
      });

      // Seed default settings if they do not exist
      for (const s of DEFAULT_SETTINGS) {
        await tx.setting.upsert({
          where: { key: s.key },
          update: {},
          create: {
            key: s.key,
            value: s.value,
            description: s.description
          }
        });
      }

      return newOwner;
    });

    await recordAuditLog({
      userId: user.id,
      action: 'SYSTEM_SETUP',
      entityType: 'User',
      entityId: user.id,
      details: { username: user.username, role: user.role },
      req
    });

    return sendSuccess(res, user, 'Initial owner account successfully created. Please sign in.', 201);
  } catch (err) {
    next(err);
  }
}

/**
 * User login with rate limiting & audit log
 */
async function login(req, res, next) {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { username: data.username.toLowerCase() }
    });

    // Constant-time-like generic message to prevent username enumeration
    if (!user) {
      return sendError(res, 'Invalid username or password.', 401);
    }

    if (!user.isActive) {
      return sendError(res, 'This account has been deactivated. Please contact an administrator.', 403);
    }

    const isValidPassword = await bcrypt.compare(data.password, user.passwordHash);
    if (!isValidPassword) {
      return sendError(res, 'Invalid username or password.', 401);
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    // Set secure HTTP-only cookie
    res.cookie('pos_token', token, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
      maxAge: 12 * 60 * 60 * 1000 // 12 hours
    });

    await recordAuditLog({
      userId: user.id,
      action: 'AUTH_LOGIN',
      entityType: 'User',
      entityId: user.id,
      details: { username: user.username, role: user.role },
      req
    });

    return sendSuccess(res, {
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    }, 'Signed in successfully.');
  } catch (err) {
    next(err);
  }
}

/**
 * Logout
 */
async function logout(req, res, next) {
  try {
    if (req.user) {
      await recordAuditLog({
        userId: req.user.id,
        action: 'AUTH_LOGOUT',
        entityType: 'User',
        entityId: req.user.id,
        req
      });
    }

    res.clearCookie('pos_token', {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: config.nodeEnv === 'production' ? 'none' : 'lax'
    });

    return sendSuccess(res, null, 'Signed out successfully.');
  } catch (err) {
    next(err);
  }
}

/**
 * Get current user profile and active shift
 */
async function getMe(req, res, next) {
  try {
    const user = req.user;

    // Check if cashier has an active shift
    const activeShift = await prisma.cashierShift.findFirst({
      where: {
        cashierId: user.id,
        status: 'OPEN'
      },
      include: {
        _count: {
          select: { sales: true }
        }
      }
    });

    return sendSuccess(res, {
      user,
      activeShift: activeShift || null
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Change current user password
 */
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return sendError(res, 'New password must be at least 8 characters.', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return sendError(res, 'Current password does not match.', 400);
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    });

    await recordAuditLog({
      userId: user.id,
      action: 'AUTH_PASSWORD_CHANGE',
      entityType: 'User',
      entityId: user.id,
      req
    });

    return sendSuccess(res, null, 'Password updated successfully.');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  checkSystemStatus,
  setupOwner,
  login,
  logout,
  getMe,
  changePassword
};
