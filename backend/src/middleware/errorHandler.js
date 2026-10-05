const { errorResponse } = require('../utils/response');

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const isUnexpectedServerError = statusCode >= 500 && !String(code).startsWith('AI_');

  const payload = errorResponse(
    code,
    isUnexpectedServerError ? 'The service could not complete the request.' : (err.message || 'An unexpected error occurred.'),
    isUnexpectedServerError ? { requestId: req.id || null } : { ...(err.details || {}), requestId: req.id || null },
  );

  res.status(statusCode).json(payload);
}

module.exports = errorHandler;
