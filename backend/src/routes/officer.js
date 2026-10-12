const express = require('express');
const { verificationWorkflowController } = require('../controllers/verificationWorkflowController');
const { upload } = require('../services/fileStorageService');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { enforceJurisdictionQueryScope } = require('../middleware/jurisdiction');

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('OFFICER', 'MINISTER', 'STATE_ADMIN', 'SUPER_ADMIN', 'ADMIN'));
router.use(enforceJurisdictionQueryScope);

// Officer Applications list, details & secure document viewer
router.get('/applications', (req, res, next) => verificationWorkflowController.getOfficerApplications(req, res, next));
router.get('/applications/:id', (req, res, next) => verificationWorkflowController.getOfficerApplicationById(req, res, next));
router.get('/applications/:id/document', (req, res, next) => verificationWorkflowController.getOfficerApplicationDocument(req, res, next));

// Generate Digital Land Record via Python AI service
router.post('/applications/:id/generate', (req, res, next) => verificationWorkflowController.generateDigitalLandRecord(req, res, next));

// Digital Record Draft operations
router.get('/applications/:id/digital-record', (req, res, next) => verificationWorkflowController.getDigitalRecordDraft(req, res, next));
router.patch('/applications/:id/digital-record', (req, res, next) => verificationWorkflowController.updateDigitalRecordDraft(req, res, next));

// Physical Verification Appointment
router.post('/applications/:id/appointment', (req, res, next) => verificationWorkflowController.scheduleAppointment(req, res, next));

// Physical Verification Session & Identity OTP
router.post('/applications/:id/verification/start', (req, res, next) => verificationWorkflowController.startVerification(req, res, next));
router.post('/applications/:id/verification/otp/send', (req, res, next) => verificationWorkflowController.sendVerificationOtp(req, res, next));
router.post('/applications/:id/verification/otp/verify', (req, res, next) => verificationWorkflowController.verifyVerificationOtp(req, res, next));

// Land Owner Photo Capture & retrieval
router.post('/applications/:id/verification/photo', upload.single('photo'), (req, res, next) => verificationWorkflowController.captureVerificationPhoto(req, res, next));
router.get('/applications/:id/verification/photo/:photoId', (req, res, next) => verificationWorkflowController.getVerificationPhoto(req, res, next));

// Final Verification & Approval / Rejection
router.post('/applications/:id/final-verify', (req, res, next) => verificationWorkflowController.performFinalVerification(req, res, next));
router.post('/applications/:id/approve', (req, res, next) => verificationWorkflowController.approveApplication(req, res, next));
router.post('/applications/:id/reject', (req, res, next) => verificationWorkflowController.rejectApplication(req, res, next));

module.exports = router;
