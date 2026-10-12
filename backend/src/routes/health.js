const express = require('express');
const { successResponse } = require('../utils/response');
const { pool } = require('../config/database');

const router = express.Router();

router.get('/health', async (req, res, next) => {
  try {
    const database = await pool.query('SELECT 1 AS healthy');
    return res.status(200).json(
      successResponse('Backend and MySQL health checks passed.', {
      service: 'dlr-backend',
      status: 'ok',
      database: Number(database.rows[0]?.healthy) === 1 ? 'ok' : 'unavailable',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      }),
    );
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
