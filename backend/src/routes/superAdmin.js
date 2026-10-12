const express = require('express');
const superAdminController = require('../controllers/superAdminController');
const { requireAuth } = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/rbac');

const router = express.Router();

// Strict RBAC: All Super Admin APIs require valid JWT and SUPER_ADMIN role
router.use(requireAuth);
router.use(requireSuperAdmin);

// Dashboard
router.get('/dashboard', superAdminController.getDashboard);

// State Master Data (28 States)
router.get('/states', superAdminController.listStates);

// State Admin Management
router.get('/state-admins', superAdminController.listStateAdmins);
router.post('/state-admins', superAdminController.createStateAdmin);
router.get('/state-admins/:id', superAdminController.getStateAdmin);
router.patch('/state-admins/:id', superAdminController.updateStateAdmin);
router.put('/state-admins/:id', superAdminController.updateStateAdmin);
router.patch('/state-admins/:id/status', superAdminController.setStateAdminStatus);
router.post('/state-admins/:id/reset-password', superAdminController.resetStateAdminPassword);

// Officer Management
router.get('/officers', superAdminController.listOfficers);
router.post('/officers', superAdminController.createOfficer);
router.get('/officers/:id', superAdminController.getOfficer);
router.patch('/officers/:id', superAdminController.updateOfficer);
router.patch('/officers/:id/status', superAdminController.setOfficerStatus);
router.post('/officers/:id/reset-password', superAdminController.resetOfficerPassword);

// Minister Management
router.get('/ministers', superAdminController.listMinisters);
router.post('/ministers', superAdminController.createMinister);
router.get('/ministers/:id', superAdminController.getMinister);
router.patch('/ministers/:id', superAdminController.updateMinister);
router.patch('/ministers/:id/status', superAdminController.setMinisterStatus);
router.post('/ministers/:id/reset-password', superAdminController.resetMinisterPassword);

// Citizen Management
router.get('/citizens', superAdminController.listCitizens);
router.get('/citizens/:id', superAdminController.getCitizen);
router.patch('/citizens/:id/status', superAdminController.setCitizenStatus);

// Generic User Password Reset
router.post('/users/:id/reset-password', superAdminController.resetUserPassword);

// Audit Logs
router.get('/audit-logs', superAdminController.getAuditLogs);

// Land Records Overview
router.get('/land-records', superAdminController.getLandRecordsOverview);

// Work Monitoring
const workMonitoringController = require('../controllers/workMonitoringController');
router.get('/work/officers', workMonitoringController.listOfficersWork);
router.get('/work/officers/:officerId', workMonitoringController.getOfficerWorkProfile);
router.get('/work/ministers', workMonitoringController.listMinistersWork);
router.get('/work/ministers/:ministerId', workMonitoringController.getMinisterWorkProfile);

// Reporting Portal
const reportingController = require('../controllers/reportingController');
router.get('/reports/overview', reportingController.getReportsOverview);
router.get('/reports/officers', reportingController.getOfficerReports);
router.get('/reports/ministers', reportingController.getMinisterReports);
router.get('/reports/land-records', reportingController.getLandRecordReports);
router.get('/reports/verification', reportingController.getVerificationReports);
router.get('/reports/ai-processing', reportingController.getAiProcessingReports);
router.get('/reports/activity', reportingController.getActivityReports);
router.get('/reports/query', reportingController.getCustomReport);

module.exports = router;
