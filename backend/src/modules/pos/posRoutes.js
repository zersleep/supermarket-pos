const express = require('express');
const router = express.Router();
const posController = require('./posController');
const { authenticateToken, requireRoles } = require('../../middleware/auth');
const { ROLES } = require('../../config/constants');

router.use(authenticateToken);
// Cashier, Admin, Owner can operate the POS
router.use(requireRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.CASHIER));

router.post('/checkout', posController.checkout);

module.exports = router;
