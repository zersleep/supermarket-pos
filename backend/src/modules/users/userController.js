const bcrypt = require('bcryptjs');
const prisma = require('../../config/db');
const { ROLES } = require('../../config/constants');
const { sendSuccess, sendPaginated, sendError } = require('../../utils/response');
const { recordAuditLog } = require('../../services/auditService');
const { createUserSchema, updateUserSchema } = require('../../validators');

/**
 * List users with pagination and search
 */
async function getUsers(req, res, next) {
  try {
    const { page = 1, limit = 20, search = '', role = '', status = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {};

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (role && Object.values(ROLES).includes(role)) {
      where.role = role;
    }

    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          shifts: {
            where: { status: 'OPEN' },
            select: { id: true, openedAt: true, openingCash: true },
            take: 1
          },
          _count: {
            select: { sales: true, shifts: true }
          }
        }
      })
    ]);

    return sendPaginated(res, users, { total, page, limit });
  } catch (err) {
    next(err);
  }
}

/**
 * Get user by ID
 */
async function getUserById(req, res, next) {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    if (!user) {
      return sendError(res, 'User not found.', 404);
    }

    return sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
}

/**
 * Create a new user (Owner can create any role; Admin cannot create Owner)
 */
async function createUser(req, res, next) {
  try {
    const data = createUserSchema.parse(req.body);

    // Privilege escalation prevention:
    if (data.role === ROLES.OWNER && req.user.role !== ROLES.OWNER) {
      return sendError(res, 'Only an existing Owner can create another Owner.', 403);
    }

    // Check duplicate username
    const existing = await prisma.user.findUnique({
      where: { username: data.username.toLowerCase() }
    });
    if (existing) {
      return sendError(res, 'Username already in use.', 409);
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const newUser = await prisma.user.create({
      data: {
        username: data.username.toLowerCase(),
        passwordHash,
        fullName: data.fullName,
        email: data.email || null,
        phone: data.phone || null,
        role: data.role,
        isActive: true
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    await recordAuditLog({
      userId: req.user.id,
      action: 'USER_CREATE',
      entityType: 'User',
      entityId: newUser.id,
      details: { username: newUser.username, role: newUser.role },
      req
    });

    return sendSuccess(res, newUser, 'User created successfully.', 201);
  } catch (err) {
    next(err);
  }
}

/**
 * Update user details or role
 */
async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const data = updateUserSchema.parse(req.body);

    const targetUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!targetUser) {
      return sendError(res, 'User not found.', 404);
    }

    // Privilege escalation protection:
    // Only an OWNER can modify another OWNER's role or details
    if (targetUser.role === ROLES.OWNER && req.user.role !== ROLES.OWNER) {
      return sendError(res, 'Only an Owner can modify an Owner account.', 403);
    }

    // Prevent changing role to OWNER unless actor is OWNER
    if (data.role === ROLES.OWNER && req.user.role !== ROLES.OWNER) {
      return sendError(res, 'Only an Owner can promote a user to Owner.', 403);
    }

    // Prevent deactivating own account
    if (id === req.user.id && data.isActive === false) {
      return sendError(res, 'You cannot deactivate your own account.', 400);
    }

    const updateData = {};
    if (data.fullName !== undefined) updateData.fullName = data.fullName;
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.phone !== undefined) updateData.phone = data.phone || null;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    if (data.password && data.password.trim().length >= 8) {
      const salt = await bcrypt.genSalt(12);
      updateData.passwordHash = await bcrypt.hash(data.password, salt);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        updatedAt: true
      }
    });

    await recordAuditLog({
      userId: req.user.id,
      action: 'USER_UPDATE',
      entityType: 'User',
      entityId: id,
      details: {
        targetUsername: targetUser.username,
        changes: Object.keys(updateData)
      },
      req
    });

    return sendSuccess(res, updatedUser, 'User updated successfully.');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser
};
