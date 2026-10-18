const express = require('express');
const router = express.Router();
const auditController = require('./auditController');
const { authenticateToken, requireRoles } = require('../../middleware/auth');
const { ROLES } = require('../../config/constants');

router.use(authenticateToken);
// Strictly restricted to Owner and Admin
router.use(requireRoles(ROLES.OWNER, ROLES.ADMIN));

router.get('/', auditController.getAuditLogs);

module.exports = router;
