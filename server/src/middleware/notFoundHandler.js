import { errorResponse } from '../utils/apiResponse.js';

/**
 * 404 Not Found Handler for unmatched routes.
 * Emits standard JSON error response instead of HTML.
 */
export const notFoundHandler = (req, res, next) => {
  return errorResponse(
    res,
    `Route ${req.method} ${req.originalUrl} not found`,
    404,
    'RESOURCE_NOT_FOUND',
    {
      method: req.method,
      path: req.originalUrl
    }
  );
};
