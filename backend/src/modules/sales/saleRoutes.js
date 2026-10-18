const express = require('express');
const router = express.Router();
const saleController = require('./saleController');
const { authenticateToken, requireRoles } = require('../../middleware/auth');
const { ROLES } = require('../../config/constants');

router.use(authenticateToken);

// View sales history and receipt details (All authenticated users: Cashier, Admin, Owner)
router.get('/', saleController.getSales);
router.get('/:id', saleController.getSaleById);

// Refunds restricted to Owner and Admin
router.post('/refund', requireRoles(ROLES.OWNER, ROLES.ADMIN), saleController.processRefund);

module.exports = router;
