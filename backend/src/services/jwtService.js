const jwt = require('jsonwebtoken');
const config = require('../config/env');

function createAppError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function signToken(user) {
  if (!user || !user.id) {
    throw new Error('Valid user object is required for JWT signing.');
  }

  const primaryRole = Array.isArray(user.roles) ? user.roles[0] : (user.roles || 'CITIZEN');

  // Minimal safe claims only
  const payload = {
    sub: user.id,
    user_id: user.id,
    role: primaryRole,
    external_reference: user.external_reference || null,
    name: user.name || null,
  };

  const options = {
    expiresIn: config.jwtExpiresIn,
  };

  return jwt.sign(payload, config.jwtSecret, options);
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') {
    throw createAppError(401, 'MISSING_TOKEN', 'Authentication token was not provided.');
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw createAppError(401, 'TOKEN_EXPIRED', 'Authentication token has expired.');
    }
    throw createAppError(401, 'INVALID_TOKEN', 'Authentication token is invalid.');
  }
}

module.exports = {
  signToken,
  verifyToken,
};
