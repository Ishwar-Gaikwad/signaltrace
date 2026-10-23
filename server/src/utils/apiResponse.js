/**
 * Standardized JSON API Response Utility
 * Ensures consistent response envelopes across all VeriAlert endpoints.
 */

/**
 * Creates a standard success response payload
 * @param {*} data - Response payload data
 * @param {string} message - Human-readable success message
 * @param {object} meta - Optional metadata (pagination, etc.)
 * @returns {object} Formatted success envelope
 */
export const formatSuccess = (data = null, message = 'Success', meta = null) => {
  const response = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };

  if (meta && Object.keys(meta).length > 0) {
    response.meta = meta;
  }

  return response;
};

/**
 * Creates a standard error response payload
 * @param {string} message - Human-readable error description
 * @param {string} code - Machine-readable error code
 * @param {*} details - Optional error details or validation issues
 * @returns {object} Formatted error envelope
 */
export const formatError = (message = 'An unexpected error occurred', code = 'INTERNAL_SERVER_ERROR', details = null) => {
  const response = {
    success: false,
    error: {
      message,
      code,
      details
    },
    timestamp: new Date().toISOString()
  };

  return response;
};

/**
 * Sends a standard success response via Express Response object
 * @param {import('express').Response} res - Express response object
 * @param {*} data - Payload data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 * @param {object} meta - Optional metadata
 */
export const successResponse = (res, data = null, message = 'Success', statusCode = 200, meta = null) => {
  return res.status(statusCode).json(formatSuccess(data, message, meta));
};

/**
 * Sends a standard error response via Express Response object
 * @param {import('express').Response} res - Express response object
 * @param {string} message - Error description
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {string} code - Machine-readable error code
 * @param {*} details - Optional error details
 */
export const errorResponse = (res, message = 'An error occurred', statusCode = 500, code = 'INTERNAL_ERROR', details = null) => {
  return res.status(statusCode).json(formatError(message, code, details));
};
