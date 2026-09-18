import env from '../config/env.js';

export const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
};

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || [];

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `Duplicate value for ${field}. Please use another value.`;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    message = errors.length
      ? `Validation failed: ${errors.map((e) => e.message).join(' ')}`
      : 'Validation failed';
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors: errors.length > 0 ? errors : undefined,
    stack: env.nodeEnv === 'development' ? err.stack : undefined,
  });
};