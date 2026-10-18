const express = require('express');
const router = express.Router();
const purchasingController = require('./purchasingController');
const { authenticateToken, requireRoles } = require('../../middleware/auth');
const { ROLES } = require('../../config/constants');

router.use(authenticateToken);
router.use(requireRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.INVENTORY_MANAGER));

router.get('/orders', purchasingController.getPurchaseOrders);
router.get('/orders/:id', purchasingController.getPOById);
router.post('/orders', purchasingController.createPurchaseOrder);
router.patch('/orders/:id/status', purchasingController.updatePOStatus);
router.post('/receiving', purchasingController.receiveGoods);

module.exports = router;
