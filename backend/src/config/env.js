const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  persistenceBackend: process.env.PERSISTENCE_BACKEND || 'memory',
  databaseUrl: process.env.DATABASE_URL || null,
  aiServiceUrl: process.env.AI_SERVICE_URL || null,
  aiServiceTimeoutMs: Number(process.env.AI_SERVICE_TIMEOUT_MS || 120000),
  jwtSecret: process.env.JWT_SECRET || 'dlr-secret-jwt-key-development-mode-only',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '3600s',
  devOtp: process.env.DEV_OTP || '123456',
  authRequired: process.env.REQUIRE_AUTH !== 'false',
  postgres: {
    host: process.env.POSTGRES_HOST || null,
    port: Number(process.env.POSTGRES_PORT || 5432),
    database: process.env.POSTGRES_DB || null,
    user: process.env.POSTGRES_USER || null,
    password: process.env.POSTGRES_PASSWORD || null,
  },
};
