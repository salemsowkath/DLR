const express = require('express');
const workMonitoringController = require('../controllers/workMonitoringController');
const { requireAuth } = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/rbac');

const router = express.Router();

// Strict RBAC: All work monitoring APIs require valid JWT and SUPER_ADMIN role
router.use(requireAuth);
router.use(requireSuperAdmin);

// Officer Work Monitoring
router.get('/officers', workMonitoringController.listOfficersWork);
router.get('/officers/:officerId', workMonitoringController.getOfficerWorkProfile);

// Minister Work Monitoring
router.get('/ministers', workMonitoringController.listMinistersWork);
router.get('/ministers/:ministerId', workMonitoringController.getMinisterWorkProfile);

module.exports = router;
