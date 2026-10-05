const express = require('express');
const documentController = require('../controllers/documentController');
const { upload } = require('../services/fileStorageService');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

router.use(requireAuth);

router.post('/upload', requireRole('CITIZEN', 'OFFICER', 'GOVERNMENT_OFFICER', 'MINISTER', 'ADMIN'), upload.single('file'), documentController.uploadDocument);
router.post('/process', requireRole('CITIZEN', 'OFFICER', 'GOVERNMENT_OFFICER', 'MINISTER', 'ADMIN'), upload.single('file'), documentController.processDocument);
router.get('/mine', documentController.getMyDocuments);
router.get('/applications/mine', documentController.getMyApplications);
router.get('/:id', documentController.getDocumentById);

module.exports = router;
