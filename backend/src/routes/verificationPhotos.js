const express = require('express');
const { verificationWorkflowController } = require('../controllers/verificationWorkflowController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/photos/:photoId', (req, res, next) => verificationWorkflowController.getVerificationPhoto(req, res, next));

module.exports = router;
