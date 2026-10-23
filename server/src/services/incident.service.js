import { IncidentReport } from '../models/index.js';

const MAX_PAGE_LIMIT = 100;

/**
 * Service to retrieve a paginated list of incident reports
 * @param {object} params
 * @param {number} params.page - 1-indexed page number
 * @param {number} params.limit - items per page (max 100)
 * @param {string} [params.eventType] - optional eventType filter
 * @param {string} [params.severity] - optional severity filter
 * @param {boolean|string} [params.isSynthetic] - optional synthetic filter
 * @param {string} [params.sourceName] - optional sourceName filter
 * @param {boolean|string} [params.hasCoordinates] - optional filter for incidents with valid coordinates
 * @param {string|Date} [params.startDate] - optional publication start date
 * @param {string|Date} [params.endDate] - optional publication end date
 * @returns {Promise<{ incidents: Array, meta: object }>}
 */
export const getPaginatedIncidents = async ({
  page = 1,
  limit = 10,
  eventType = null,
  severity = null,
  isSynthetic = null,
  sourceName = null,
  hasCoordinates = null,
  startDate = null,
  endDate = null
} = {}) => {
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);

  if (isNaN(pageNum) || pageNum < 1) {
    const error = new Error('Page must be a positive integer greater than or equal to 1');
    error.statusCode = 400;
    error.code = 'INVALID_PAGINATION_PARAMETERS';
    throw error;
  }

  if (isNaN(limitNum) || limitNum < 1 || limitNum > MAX_PAGE_LIMIT) {
    const error = new Error(`Limit must be a positive integer between 1 and ${MAX_PAGE_LIMIT}`);
    error.statusCode = 400;
    error.code = 'INVALID_PAGINATION_PARAMETERS';
    throw error;
  }

  const query = {};
  if (eventType) {
    query.eventType = eventType.toLowerCase();
  }
  if (severity) {
    query.severity = severity.toLowerCase();
  }
  if (isSynthetic !== null && isSynthetic !== undefined) {
    query.isSynthetic = isSynthetic === true || isSynthetic === 'true';
  }
  if (sourceName) {
    query.sourceName = sourceName;
  }
  if (hasCoordinates === true || hasCoordinates === 'true') {
    query['geographicInfo.coordinates.latitude'] = { $ne: null };
    query['geographicInfo.coordinates.longitude'] = { $ne: null };
  }
  if (startDate || endDate) {
    query.publishedAt = {};
    if (startDate) {
      const s = new Date(startDate);
      if (!isNaN(s.getTime())) query.publishedAt.$gte = s;
    }
    if (endDate) {
      const e = new Date(endDate);
      if (!isNaN(e.getTime())) query.publishedAt.$lte = e;
    }
    if (Object.keys(query.publishedAt).length === 0) {
      delete query.publishedAt;
    }
  }

  const skip = (pageNum - 1) * limitNum;

  // Execute count and query concurrently with deterministic sorting
  const [totalRecords, incidents] = await Promise.all([
    IncidentReport.countDocuments(query),
    IncidentReport.find(query)
      .select('-rawPayload') // omit internal raw payloads from public list
      .sort({ publishedAt: -1, _id: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean()
  ]);

  const totalPages = Math.ceil(totalRecords / limitNum) || 1;

  const meta = {
    page: pageNum,
    limit: limitNum,
    totalRecords,
    totalPages,
    hasNextPage: pageNum < totalPages,
    hasPrevPage: pageNum > 1
  };

  return { incidents, meta };
};
