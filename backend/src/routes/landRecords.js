const express = require('express');
const { verificationWorkflowController } = require('../controllers/verificationWorkflowController');
const { upload } = require('../services/fileStorageService');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

router.use(requireAuth);

// Citizen application submission
router.post('/applications', requireRole('CITIZEN'), upload.single('file'), (req, res, next) => {
  verificationWorkflowController.submitCitizenApplication(req, res, next);
});

// Citizen applications tracking
router.get('/my-applications', requireRole('CITIZEN'), (req, res, next) => {
  verificationWorkflowController.getMyApplications(req, res, next);
});

router.get('/my-applications/:id', requireRole('CITIZEN'), (req, res, next) => {
  verificationWorkflowController.getMyApplicationById(req, res, next);
});

// Approved Digital Land Records
router.get('/approved', (req, res, next) => {
  verificationWorkflowController.getApprovedLandRecords(req, res, next);
});

router.get('/approved/:id', (req, res, next) => {
  verificationWorkflowController.getApprovedLandRecordById(req, res, next);
});

router.get('/approved/:id/pdf', (req, res, next) => {
  verificationWorkflowController.downloadApprovedLandRecordPdf(req, res, next);
});

module.exports = router;
