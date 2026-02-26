const logger = require('../utils/logger');

/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Convert non-ApiError errors to ApiError
 */
const errorConverter = (err, req, res, next) => {
  let error = err;
  
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, false, err.stack);
  }
  
  next(error);
};

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;
  
  // Default to 500 if statusCode is not set
  statusCode = statusCode || 500;
  
  // Log error
  if (statusCode >= 500) {
    logger.error(`Error ${statusCode}: ${message}`, {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      stack: err.stack,
    });
  } else {
    logger.warn(`Error ${statusCode}: ${message}`, {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
    });
  }
  
  // Prepare error response
  const response = {
    status: 'error',
    statusCode,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  };
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    response.statusCode = 400;
    response.message = 'Validation Error';
    response.errors = Object.values(err.errors).map(e => e.message);
  }
  
  if (err.name === 'CastError') {
    response.statusCode = 400;
    response.message = 'Invalid ID format';
  }
  
  if (err.code === 11000) {
    response.statusCode = 409;
    response.message = 'Duplicate field value entered';
  }
  
  if (err.name === 'JsonWebTokenError') {
    response.statusCode = 401;
    response.message = 'Invalid token';
  }
  
  if (err.name === 'TokenExpiredError') {
    response.statusCode = 401;
    response.message = 'Token expired';
  }
  
  if (err.name === 'MulterError') {
    response.statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      response.message = 'File size too large';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      response.message = 'Unexpected file field';
    } else {
      response.message = err.message;
    }
  }
  
  res.status(response.statusCode).json(response);
};

/**
 * Handle 404 errors
 */
const notFound = (req, res, next) => {
  const error = new ApiError(404, `Route not found: ${req.originalUrl}`);
  next(error);
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  ApiError,
  errorConverter,
  errorHandler,
  notFound,
  asyncHandler,
};
