function successResponse(message, data = null, meta = {}) {
  return {
    success: true,
    message,
    data,
    meta,
  };
}

function errorResponse(code, message, details = null) {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };
}

module.exports = {
  successResponse,
  errorResponse,
};
