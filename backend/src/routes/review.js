const express = require('express');
const reviewController = require('../controllers/reviewController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('OFFICER', 'MINISTER', 'ADMIN'));

router.get('/cases', reviewController.getReviewCases);
router.get('/cases/:id', reviewController.getReviewCaseById);
router.post('/cases/:id/approve', reviewController.approveCase);
router.post('/cases/:id/reject', reviewController.rejectCase);
router.post('/cases/:id/correction', reviewController.createCorrection);
router.post('/cases/:id/hold', reviewController.holdCase);
router.post('/cases/:id/notes', reviewController.addNote);
router.post('/cases/:id/anomalies/:anomalyId/resolve', reviewController.resolveAnomaly);

module.exports = router;
