const config = require('../config/env');
const { verifyToken } = require('../services/jwtService');
const { userRepository } = require('../repositories/userRepository');

function createAppError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    }

    if (!token) {
      const isAuthEnforced = process.env.REQUIRE_AUTH === 'true' || (config.nodeEnv === 'production' && process.env.REQUIRE_AUTH !== 'false');
      if (!isAuthEnforced) {
        req.user = {
          id: 'usr-anonymous-test',
          name: 'Anonymous Test User',
          external_reference: 'ANONYMOUS',
          status: 'ACTIVE',
          roles: ['CITIZEN'],
          primary_role: 'CITIZEN',
        };
        return next();
      }
      throw createAppError(401, 'MISSING_TOKEN', 'Authentication token is required.');
    }

    const decoded = verifyToken(token);
    const user = await userRepository.findById(decoded.user_id);

    if (!user) {
      throw createAppError(401, 'INVALID_USER', 'User referenced by token no longer exists.');
    }

    if (user.status !== 'ACTIVE') {
      throw createAppError(401, 'USER_SUSPENDED', 'User account is inactive or suspended.');
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  requireAuth,
};
