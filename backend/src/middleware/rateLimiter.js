const attemptsMap = new Map();

function createAppError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function rateLimiter({ windowMs = 60 * 1000, maxRequests = 10 } = {}) {
  return (req, res, next) => {
    // Disable rate limiting during automated test suite runs unless explicitly enabled
    if (process.env.NODE_ENV === 'test' && process.env.ENABLE_RATE_LIMITER !== 'true') {
      return next();
    }

    const key = `${req.ip}_${req.path}`;
    const now = Date.now();

    const record = attemptsMap.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > record.resetAt) {
      record.count = 1;
      record.resetAt = now + windowMs;
    } else {
      record.count += 1;
    }

    attemptsMap.set(key, record);

    if (record.count > maxRequests) {
      throw createAppError(429, 'TOO_MANY_REQUESTS', 'Too many requests. Please try again later.');
    }

    return next();
  };
}

function resetRateLimiter() {
  attemptsMap.clear();
}

module.exports = {
  rateLimiter,
  resetRateLimiter,
};
