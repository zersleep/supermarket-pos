const express = require('express');
const router = express.Router();
const paymentController = require('./paymentController');
const { authenticateToken, requireRoles } = require('../../middleware/auth');
const { ROLES } = require('../../config/constants');

router.use(authenticateToken);

// View pending payments
router.get('/pending', paymentController.getPendingPayments);

// Confirm QR / e-wallet payment (Cashier, Admin, Owner)
router.post('/:id/confirm', requireRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.CASHIER), paymentController.confirmPayment);

// Cancel pending payment & release reservation
router.post('/:id/cancel', requireRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.CASHIER), paymentController.cancelPendingPayment);

module.exports = router;
