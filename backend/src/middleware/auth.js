const { verifyToken } = require('../services/jwtService');
const { userRepository } = require('../repositories/userRepository');
const { sessionService } = require('../services/sessionService');

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
      throw createAppError(401, 'MISSING_TOKEN', 'Authentication token is required.');
    }

    const clientContextId = req.headers['x-client-context-id'] || req.headers['x-session-context'];
    if (clientContextId && !sessionService.isSessionActive(clientContextId, token)) {
      throw createAppError(401, 'SESSION_REPLACED', 'Your DLR session was replaced by a new login.');
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
