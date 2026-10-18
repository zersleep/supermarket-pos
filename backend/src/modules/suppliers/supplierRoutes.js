const express = require('express');
const router = express.Router();
const supplierController = require('./supplierController');
const { authenticateToken, requireRoles } = require('../../middleware/auth');
const { ROLES } = require('../../config/constants');

router.use(authenticateToken);
router.use(requireRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.INVENTORY_MANAGER));

router.get('/', supplierController.getSuppliers);
router.get('/:id', supplierController.getSupplierById);
router.post('/', supplierController.createSupplier);
router.put('/:id', supplierController.updateSupplier);

module.exports = router;
