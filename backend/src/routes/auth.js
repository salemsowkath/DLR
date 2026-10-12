const express = require('express');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { rateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

const authRateLimit = rateLimiter({ windowMs: 60 * 1000, maxRequests: 10 });

router.post('/citizen/register', authRateLimit, authController.registerCitizen);
router.post('/citizen/otp/request', authRateLimit, authController.requestCitizenOtp);
router.post('/citizen/otp/verify', authRateLimit, authController.verifyCitizenOtp);
router.post('/officer/login', authRateLimit, authController.officerLogin);
router.post('/minister/login', authRateLimit, authController.ministerLogin);
router.post('/state-admin/login', authRateLimit, authController.stateAdminLogin);
router.post('/super-admin/login', authRateLimit, authController.superAdminLogin);

router.get('/me', requireAuth, authController.getMe);
router.post('/logout', requireAuth, authController.logout);

module.exports = router;
