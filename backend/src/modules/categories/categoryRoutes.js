const express = require('express');
const router = express.Router();
const categoryController = require('./categoryController');
const { authenticateToken, requireRoles } = require('../../middleware/auth');
const { ROLES } = require('../../config/constants');

router.use(authenticateToken);

// All authenticated roles can view categories
router.get('/', categoryController.getCategories);

// Only Owner, Admin, and Inventory Manager can create/update
router.post('/', requireRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.INVENTORY_MANAGER), categoryController.createCategory);
router.put('/:id', requireRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.INVENTORY_MANAGER), categoryController.updateCategory);

module.exports = router;
