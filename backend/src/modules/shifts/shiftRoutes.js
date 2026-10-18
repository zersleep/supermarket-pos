const express = require('express');
const router = express.Router();
const shiftController = require('./shiftController');
const { authenticateToken, requireRoles } = require('../../middleware/auth');
const { ROLES } = require('../../config/constants');

router.use(authenticateToken);
router.use(requireRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.CASHIER));

router.get('/current', shiftController.getCurrentShift);
router.get('/history', shiftController.getShiftHistory);
router.post('/open', shiftController.openShift);
router.post('/cash-movement', shiftController.recordCashMovement);
router.post('/:id/close', shiftController.closeShift);

module.exports = router;
