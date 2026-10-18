const { ZodError } = require('zod');
const { Prisma } = require('@prisma/client');
const config = require('../config/env');

function errorHandler(err, req, res, next) {
  // If response has already started sending
  if (res.headersSent) {
    return next(err);
  }

  // Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors
    });
  }

  // Prisma Known Request Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation (e.g. duplicate barcode, username, sku)
    if (err.code === 'P2002') {
      const target = err.meta?.target || 'field';
      return res.status(409).json({
        success: false,
        message: `A record with this ${Array.isArray(target) ? target.join(', ') : target} already exists.`
      });
    }

    // Foreign key constraint failed
    if (err.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Related record was not found or is currently in use.'
      });
    }

    // Record not found
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'The requested record could not be found.'
      });
    }
  }

  // JSON Web Token Errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Authentication session expired or invalid. Please sign in again.'
    });
  }

  // Custom Application Errors
  const statusCode = err.statusCode || 500;
  const message = err.isOperational || config.nodeEnv === 'development'
    ? err.message
    : 'Internal server error';

  if (config.nodeEnv === 'development') {
    console.error('Unhandled Application Error:', err);
  }

  return res.status(statusCode).json({
    success: false,
    message,
    ...(config.nodeEnv === 'development' && { stack: err.stack })
  });
}

module.exports = errorHandler;
