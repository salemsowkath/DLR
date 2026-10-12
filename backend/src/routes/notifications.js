const express = require('express');
const { verificationWorkflowController } = require('../controllers/verificationWorkflowController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', (req, res, next) => verificationWorkflowController.getNotifications(req, res, next));
router.patch('/:id/read', (req, res, next) => verificationWorkflowController.markNotificationRead(req, res, next));
router.patch('/read-all', (req, res, next) => verificationWorkflowController.markAllNotificationsRead(req, res, next));

module.exports = router;
