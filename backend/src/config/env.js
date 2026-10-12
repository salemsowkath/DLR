const path = require('path');
const dotenv = require('dotenv');

// Load the backend-local file first, then fall back to the workspace environment.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

module.exports = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  persistenceBackend: process.env.PERSISTENCE_BACKEND || 'mysql',
  mysql: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME || 'dlr_database',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || null,
  },
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000',
  aiServiceTimeoutMs: Number(process.env.AI_SERVICE_TIMEOUT_MS || 120000),
  jwtSecret: process.env.JWT_SECRET || 'dlr-secret-jwt-key-development-mode-only',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '3600s',
  devOtp: process.env.DEV_OTP || '123456',
  authRequired: process.env.REQUIRE_AUTH !== 'false',
  corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001,http://localhost:3002').split(',').map((o) => o.trim()),
};
