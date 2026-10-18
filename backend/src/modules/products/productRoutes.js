const express = require('express');
const router = express.Router();
const productController = require('./productController');
const { authenticateToken, requireRoles } = require('../../middleware/auth');
const { ROLES } = require('../../config/constants');

router.use(authenticateToken);

// Product browsing & barcode scanner endpoint for all authorized roles (Cashier, Admin, Owner, Inv Manager)
router.get('/barcode/:barcode', productController.getProductByBarcode);
router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);

// Product creation and editing restricted to Owner, Admin, and Inventory Manager
router.post('/', requireRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.INVENTORY_MANAGER), productController.createProduct);
router.put('/:id', requireRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.INVENTORY_MANAGER), productController.updateProduct);

module.exports = router;
