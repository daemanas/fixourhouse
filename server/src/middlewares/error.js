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
    const field = Object.keys(err.keyValue || err.keyPattern || {})[0];
    message = field === 'phone'
      ? 'An account already exists with this phone number. Please login instead.'
      : field === 'email'
        ? 'An account already exists with this email address. Please login instead.'
        : 'This account information is already in use.';
    err.code = field === 'phone' ? 'PHONE_ALREADY_EXISTS'
      : field === 'email' ? 'EMAIL_ALREADY_EXISTS'
        : 'DUPLICATE_VALUE';
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
    message = `Invalid ${err.path}.`;
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

  if (statusCode >= 500 && !err.isOperational) {
    message = 'An unexpected server error occurred. Please try again later.';
    errors = [];
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors: errors.length > 0 ? errors : undefined,
    code: typeof err.code === 'string' ? err.code : undefined,
    stack: undefined,
  });
};