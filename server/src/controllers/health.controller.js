import { getHealthMetrics } from '../services/health.service.js';
import { successResponse } from '../utils/apiResponse.js';

/**
 * Health Controller
 * Responds to GET /api/health with system status, timestamp, and database connectivity.
 */
export const getHealth = (req, res, next) => {
  try {
    const health = getHealthMetrics();
    return successResponse(res, health, 'VeriAlert API is operational');
  } catch (error) {
    next(error);
  }
};
