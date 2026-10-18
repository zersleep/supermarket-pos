const prisma = require('../../config/db');
const { sendSuccess, sendPaginated, sendError } = require('../../utils/response');
const { roundToTwo } = require('../../utils/money');
const { recordAuditLog } = require('../../services/auditService');
const { openShiftSchema, closeShiftSchema, cashMovementSchema } = require('../../validators');

/**
 * Get active shift for current cashier
 */
async function getCurrentShift(req, res, next) {
  try {
    const shift = await prisma.cashierShift.findFirst({
      where: {
        cashierId: req.user.id,
        status: 'OPEN'
      },
      include: {
        cashMovements: {
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: { sales: true }
        }
      }
    });

    return sendSuccess(res, shift);
  } catch (err) {
    next(err);
  }
}

/**
 * Open a new shift
 */
async function openShift(req, res, next) {
  try {
    const data = openShiftSchema.parse(req.body);

    // Check if cashier already has an open shift
    const existingOpenShift = await prisma.cashierShift.findFirst({
      where: {
        cashierId: req.user.id,
        status: 'OPEN'
      }
    });

    if (existingOpenShift) {
      return sendError(res, 'You already have an active open shift. Please close it first.', 400);
    }

    const openingCash = roundToTwo(data.openingCash);

    const shift = await prisma.cashierShift.create({
      data: {
        cashierId: req.user.id,
        status: 'OPEN',
        openingCash,
        expectedClosingCash: openingCash,
        notes: data.notes || null
      }
    });

    await recordAuditLog({
      userId: req.user.id,
      action: 'SHIFT_OPEN',
      entityType: 'CashierShift',
      entityId: shift.id,
      details: { openingCash },
      req
    });

    return sendSuccess(res, shift, 'Shift opened successfully.', 201);
  } catch (err) {
    next(err);
  }
}

/**
 * Record cash movement (Cash-In or Cash-Out) during an active shift
 */
async function recordCashMovement(req, res, next) {
  try {
    const data = cashMovementSchema.parse(req.body);

    const shift = await prisma.cashierShift.findUnique({
      where: { id: data.shiftId }
    });

    if (!shift) {
      return sendError(res, 'Shift not found.', 404);
    }

    if (shift.status !== 'OPEN') {
      return sendError(res, 'Cannot add cash movement to a closed shift.', 400);
    }

    const amount = roundToTwo(data.amount);

    const result = await prisma.$transaction(async (tx) => {
      const movement = await tx.cashMovement.create({
        data: {
          shiftId: shift.id,
          userId: req.user.id,
          type: data.type,
          amount,
          reason: data.reason
        }
      });

      const updateData = {};
      if (data.type === 'CASH_IN') {
        updateData.cashInTotal = { increment: amount };
        updateData.expectedClosingCash = { increment: amount };
      } else {
        updateData.cashOutTotal = { increment: amount };
        updateData.expectedClosingCash = { decrement: amount };
      }

      const updatedShift = await tx.cashierShift.update({
        where: { id: shift.id },
        data: updateData
      });

      return { movement, shift: updatedShift };
    });

    await recordAuditLog({
      userId: req.user.id,
      action: `SHIFT_${data.type}`,
      entityType: 'CashMovement',
      entityId: result.movement.id,
      details: {
        shiftId: shift.id,
        amount,
        reason: data.reason
      },
      req
    });

    return sendSuccess(res, result, 'Cash movement recorded.', 201);
  } catch (err) {
    next(err);
  }
}

/**
 * Close active shift with actual counted cash reconciliation
 */
async function closeShift(req, res, next) {
  try {
    const { id } = req.params;
    const data = closeShiftSchema.parse(req.body);

    const shift = await prisma.cashierShift.findUnique({
      where: { id },
      include: {
        cashier: { select: { fullName: true } }
      }
    });

    if (!shift) {
      return sendError(res, 'Shift not found.', 404);
    }

    if (shift.status !== 'OPEN') {
      return sendError(res, 'Shift is already closed.', 400);
    }

    // Only the shift owner or Admin/Owner can close the shift
    if (shift.cashierId !== req.user.id && !['OWNER', 'ADMIN'].includes(req.user.role)) {
      return sendError(res, 'You do not have permission to close another cashier’s shift.', 403);
    }

    const actualCash = roundToTwo(data.actualClosingCash);
    const expectedCash = roundToTwo(shift.expectedClosingCash);
    const difference = roundToTwo(actualCash - expectedCash);

    const closedShift = await prisma.cashierShift.update({
      where: { id: shift.id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        actualClosingCash: actualCash,
        difference,
        notes: data.notes || shift.notes
      }
    });

    await recordAuditLog({
      userId: req.user.id,
      action: 'SHIFT_CLOSE',
      entityType: 'CashierShift',
      entityId: shift.id,
      details: {
        expectedCash,
        actualCash,
        difference,
        cashierName: shift.cashier.fullName
      },
      req
    });

    return sendSuccess(res, closedShift, 'Shift closed and cash reconciled successfully.');
  } catch (err) {
    next(err);
  }
}

/**
 * Get shift history with pagination and filters
 */
async function getShiftHistory(req, res, next) {
  try {
    const { page = 1, limit = 20, status = '', cashierId = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {};
    if (status) where.status = status;

    // Cashiers can only view their own shifts, while Owner/Admin can view all
    if (req.user.role === 'CASHIER') {
      where.cashierId = req.user.id;
    } else if (cashierId) {
      where.cashierId = cashierId;
    }

    const [total, shifts] = await Promise.all([
      prisma.cashierShift.count({ where }),
      prisma.cashierShift.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { openedAt: 'desc' },
        include: {
          cashier: { select: { id: true, fullName: true, username: true } },
          _count: { select: { sales: true, cashMovements: true } }
        }
      })
    ]);

    return sendPaginated(res, shifts, { total, page, limit });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCurrentShift,
  openShift,
  recordCashMovement,
  closeShift,
  getShiftHistory
};
