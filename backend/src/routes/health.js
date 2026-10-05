const express = require('express');
const { successResponse } = require('../utils/response');

const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json(
    successResponse('Backend health check passed.', {
      service: 'dlr-backend',
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    })
  );
});

module.exports = router;
