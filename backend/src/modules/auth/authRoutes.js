const express = require('express');
const router = express.Router();
const authController = require('./authController');
const { authenticateToken } = require('../../middleware/auth');
const { loginLimiter, setupLimiter } = require('../../middleware/rateLimiter');

router.get('/status', authController.checkSystemStatus);
router.post('/setup', setupLimiter, authController.setupOwner);
router.post('/login', loginLimiter, authController.login);
router.post('/logout', authController.logout);
router.get('/me', authenticateToken, authController.getMe);
router.put('/password', authenticateToken, authController.changePassword);

module.exports = router;
