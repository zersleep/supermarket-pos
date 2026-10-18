const express = require('express');
const router = express.Router();
const reportController = require('./reportController');
const { authenticateToken, requireRoles } = require('../../middleware/auth');
const { ROLES } = require('../../config/constants');

router.use(authenticateToken);

// Reports restricted to Owner, Admin, and Inventory Manager
router.get('/sales', requireRoles(ROLES.OWNER, ROLES.ADMIN), reportController.getSalesReport);
router.get('/inventory', requireRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.INVENTORY_MANAGER), reportController.getInventoryReport);
router.get('/export-sales-csv', requireRoles(ROLES.OWNER, ROLES.ADMIN), reportController.exportSalesReportCsv);

module.exports = router;
