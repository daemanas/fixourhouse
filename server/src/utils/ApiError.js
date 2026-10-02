class ApiError extends Error {
  constructor(statusCode, message, errors = [], code) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    if (code) this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export default ApiError;