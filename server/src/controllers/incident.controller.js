import { getPaginatedIncidents } from '../services/incident.service.js';
import { successResponse } from '../utils/apiResponse.js';

/**
 * Controller to handle GET /api/incidents
 * Returns a paginated list of incident reports with metadata
 */
export const listIncidents = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      eventType,
      severity,
      isSynthetic,
      sourceName,
      hasCoordinates,
      startDate,
      endDate
    } = req.query;

    const { incidents, meta } = await getPaginatedIncidents({
      page,
      limit,
      eventType,
      severity,
      isSynthetic,
      sourceName,
      hasCoordinates,
      startDate,
      endDate
    });

    return successResponse(res, incidents, 'Incident reports retrieved successfully', 200, meta);
  } catch (error) {
    next(error);
  }
};
