const express = require('express');
const reviewController = require('../controllers/reviewController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('OFFICER', 'MINISTER', 'ADMIN'));

router.get('/stats', reviewController.getReviewStats);
router.get('/cases', reviewController.getReviewCases);
router.get('/cases/:id', reviewController.getReviewCaseById);
router.post('/cases/:id/start', reviewController.startCase);
router.post('/cases/:id/process-ai', reviewController.processCaseAI);
router.post('/cases/:id/approve', reviewController.approveCase);
router.post('/cases/:id/reject', reviewController.rejectCase);
router.post('/cases/:id/request-correction', reviewController.requestCorrectionCase);
router.post('/cases/:id/correction', reviewController.createCorrection);
router.post('/cases/:id/corrections', reviewController.createCorrection);
router.post('/cases/:id/hold', reviewController.holdCase);
router.post('/cases/:id/notes', reviewController.addNote);
router.post('/cases/:id/anomalies/:anomalyId/resolve', reviewController.resolveAnomaly);

module.exports = router;
