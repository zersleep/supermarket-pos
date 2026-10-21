const express = require('express');
const router = express.Router();
const inventoryController = require('./inventoryController');
const { authenticateToken, requireRoles } = require('../../middleware/auth');
const { ROLES } = require('../../config/constants');

router.use(authenticateToken);

// All inventory views for Owner, Admin, Inventory Manager (and summary for dashboard)
router.get('/summary', inventoryController.getInventorySummary);
router.get('/batches', inventoryController.getBatches);
router.get('/movements', inventoryController.getStockMovements);

// Inventory modifications restricted to Owner, Admin, and Inventory Manager
router.post('/add-stock', requireRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.INVENTORY_MANAGER), inventoryController.addStock);
router.put('/batches/:id', requireRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.INVENTORY_MANAGER), inventoryController.updateBatch);
router.post('/adjust', requireRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.INVENTORY_MANAGER), inventoryController.adjustStock);
router.post('/write-off', requireRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.INVENTORY_MANAGER), inventoryController.writeOffBatch);

module.exports = router;
