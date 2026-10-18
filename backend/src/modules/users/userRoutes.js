const express = require('express');
const router = express.Router();
const userController = require('./userController');
const { authenticateToken, requireRoles } = require('../../middleware/auth');
const { ROLES } = require('../../config/constants');

// User management restricted to OWNER and ADMIN
router.use(authenticateToken);
router.use(requireRoles(ROLES.OWNER, ROLES.ADMIN));

router.get('/', userController.getUsers);
router.get('/:id', userController.getUserById);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);

module.exports = router;
