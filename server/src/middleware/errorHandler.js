import { errorResponse } from '../utils/apiResponse.js';
import { config } from '../config/env.js';

/**
 * Centralized Error-Handling Middleware
 * Catches all forwarded errors and unhandled exceptions, formatting them
 * into the standard SignalTrace JSON envelope.
 */
export const errorHandler = (err, req, res, next) => {
  // If response headers already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';
  let errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  let details = err.details || null;

  // Handle malformed JSON body parser error (e.g., from express.json())
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    errorCode = 'INVALID_JSON_PAYLOAD';
    message = 'Malformed JSON in request payload';
  }

  // Handle Mongoose CastError (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    statusCode = 400;
    errorCode = 'INVALID_RESOURCE_IDENTIFIER';
    message = `Invalid value for field '${err.path}'`;
    details = { path: err.path, value: err.value };
  }

  // Handle Mongoose ValidationError
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Data validation failed';
    details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message
    }));
  }

  // Handle MongoDB duplicate key error (code 11000)
  if (err.code === 11000) {
    statusCode = 409;
    errorCode = 'DUPLICATE_RESOURCE';
    message = 'A duplicate resource already exists with the provided unique key';
    details = err.keyValue || null;
  }

  // Log error details for server diagnostics (suppressed in test unless unexpected)
  if (config.nodeEnv !== 'test') {
    console.error(`[Error] [${req.method} ${req.originalUrl}] ${statusCode} - ${message}`);
    if (statusCode >= 500 && err.stack) {
      console.error(err.stack);
    }
  }

  // Include stack trace in dev/debug mode if available
  const responseDetails = config.nodeEnv === 'development' && err.stack
    ? { ...(details || {}), stack: err.stack }
    : details;

  return errorResponse(res, message, statusCode, errorCode, responseDetails);
};
