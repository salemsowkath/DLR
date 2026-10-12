const express = require('express');
const documentController = require('../controllers/documentController');
const { upload } = require('../services/fileStorageService');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

router.use(requireAuth);

// Citizen submission: upload document + manual details into MySQL (AI is NOT run during Citizen submission)
router.post('/', requireRole('CITIZEN'), upload.single('file'), documentController.submitCitizenApplication);

// Citizen check for duplicate Survey Number in given location
router.post('/check-duplicate', requireRole('CITIZEN'), documentController.checkDuplicateRecord);

// File-only upload
router.post('/upload', requireRole('CITIZEN'), upload.single('file'), documentController.uploadDocument);

// Legacy direct pipeline endpoint
router.post('/process', requireRole('CITIZEN'), upload.single('file'), documentController.processDocument);

router.get('/mine', documentController.getMyDocuments);
router.get('/applications/mine', documentController.getMyApplications);
router.get('/:id/file', documentController.getDocumentFile);
router.get('/:id', documentController.getDocumentById);

module.exports = router;
