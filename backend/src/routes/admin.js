const express = require('express');
const adminController = require('../controllers/adminController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('MINISTER', 'ADMIN'));

router.get('/dashboard', adminController.getDashboard);
router.get('/stats', adminController.getDashboard);

module.exports = router;
