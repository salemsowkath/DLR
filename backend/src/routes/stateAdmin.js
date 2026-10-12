const express = require('express');
const stateAdminController = require('../controllers/stateAdminController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { enforceJurisdictionQueryScope } = require('../middleware/jurisdiction');

const router = express.Router();

// Strict RBAC: All State Admin APIs require valid JWT and STATE_ADMIN (or SUPER_ADMIN) role
router.use(requireAuth);
router.use(requireRole('STATE_ADMIN', 'SUPER_ADMIN'));
router.use(enforceJurisdictionQueryScope);

// Dashboard
router.get('/dashboard', stateAdminController.getDashboard);

// Officer Management (State-scoped)
router.get('/officers', stateAdminController.listOfficers);
router.post('/officers', stateAdminController.createOfficer);
router.get('/officers/:id', stateAdminController.getOfficer);
router.patch('/officers/:id', stateAdminController.updateOfficer);
router.put('/officers/:id', stateAdminController.updateOfficer);
router.patch('/officers/:id/status', stateAdminController.setOfficerStatus);
router.post('/officers/:id/reset-password', stateAdminController.resetOfficerPassword);

// Minister Management (State-scoped)
router.get('/ministers', stateAdminController.listMinisters);
router.post('/ministers', stateAdminController.createMinister);
router.get('/ministers/:id', stateAdminController.getMinister);
router.patch('/ministers/:id', stateAdminController.updateMinister);
router.put('/ministers/:id', stateAdminController.updateMinister);
router.patch('/ministers/:id/status', stateAdminController.setMinisterStatus);
router.post('/ministers/:id/reset-password', stateAdminController.resetMinisterPassword);

// Citizen Directory (State-scoped)
router.get('/citizens', stateAdminController.listCitizens);
router.get('/citizens/:id', stateAdminController.getCitizen);

// Land Records & Applications (State-scoped)
router.get('/land-records', stateAdminController.listLandRecords);
router.get('/land-records/:id', stateAdminController.getLandRecord);
router.get('/applications', stateAdminController.listApplications);
router.get('/applications/:id', stateAdminController.getApplication);

// State Reports
router.get('/reports', stateAdminController.getReports);

module.exports = router;
