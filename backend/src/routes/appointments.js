const express = require('express');
const { verificationWorkflowController } = require('../controllers/verificationWorkflowController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', (req, res, next) => verificationWorkflowController.getAppointments(req, res, next));

module.exports = router;
