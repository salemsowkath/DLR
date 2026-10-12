const { errorResponse } = require('../utils/response');

function errorHandler(err, req, res, next) {
  if (err && (err.name === 'MulterError' && err.code === 'LIMIT_FILE_SIZE')) {
    return res.status(413).json(errorResponse('FILE_TOO_LARGE', 'File exceeds the 10 MB limit.', { limit: '10MB' }));
  }

  const statusCode = err.statusCode || (err.code === 'FILE_TOO_LARGE' ? 413 : 500);
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
