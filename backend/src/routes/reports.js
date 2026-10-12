const express = require('express');
const reportingController = require('../controllers/reportingController');
const { requireAuth } = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/rbac');

const router = express.Router();

// Strict RBAC: All reporting APIs require valid JWT and SUPER_ADMIN role
router.use(requireAuth);
router.use(requireSuperAdmin);

// Super Admin Protected Report Endpoints
router.get('/overview', reportingController.getReportsOverview);
router.get('/officers', reportingController.getOfficerReports);
router.get('/ministers', reportingController.getMinisterReports);
router.get('/land-records', reportingController.getLandRecordReports);
router.get('/verification', reportingController.getVerificationReports);
router.get('/ai-processing', reportingController.getAiProcessingReports);
router.get('/status', reportingController.getApplicationStatusReports);
router.get('/application-status', reportingController.getApplicationStatusReports);
router.get('/state-wise', reportingController.getStateWiseReports);
router.get('/district-wise', reportingController.getDistrictWiseReports);
router.get('/activity', reportingController.getActivityReports);
router.get('/query', reportingController.getCustomReport);

module.exports = router;
