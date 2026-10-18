/**
 * Standardized API Response Helpers
 */

function sendSuccess(res, data = null, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
}

function sendPaginated(res, data, pagination, message = 'Success') {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      total: pagination.total,
      page: Number(pagination.page),
      limit: Number(pagination.limit),
      totalPages: Math.ceil(pagination.total / pagination.limit) || 1
    }
  });
}

function sendError(res, message = 'An error occurred', statusCode = 500, errors = null) {
  return res.status(statusCode).json({
    success: false,
    message,
    errors
  });
}

module.exports = {
  sendSuccess,
  sendPaginated,
  sendError
};
