const express = require('express');
const router = express.Router();
const settingController = require('./settingController');
const { authenticateToken, requireRoles } = require('../../middleware/auth');
const { ROLES } = require('../../config/constants');

router.use(authenticateToken);

// All authenticated roles can view store settings (for receipt & currency display)
router.get('/', settingController.getSettings);

// Only Owner can modify store settings
router.put('/', requireRoles(ROLES.OWNER, ROLES.ADMIN), settingController.updateSettings);

module.exports = router;
