import { Claim, Evidence } from '../models/index.js';

const MAX_PAGE_LIMIT = 50;

/**
 * Service to retrieve a paginated list of claims
 * @param {object} params
 * @param {number} params.page - 1-indexed page number
 * @param {number} params.limit - items per page (max 50)
 * @param {string} [params.status] - optional processingStatus filter
 * @returns {Promise<{ claims: Array, meta: object }>}
 */
export const getPaginatedClaims = async ({ page = 1, limit = 10, status = null, verdict = null } = {}) => {
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
  if (status) {
    query.processingStatus = status;
  }
  if (verdict) {
    query['atomicClaims.verificationStatus'] = verdict;
  }

  const skip = (pageNum - 1) * limitNum;

  // Execute count and query concurrently
  const [totalRecords, claims] = await Promise.all([
    Claim.countDocuments(query),
    Claim.find(query)
      .sort({ createdAt: -1, _id: -1 })
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

  return { claims, meta };
};

/**
 * Service to retrieve a single claim by its ID along with associated evidence
 * @param {string} claimId - MongoDB ObjectId string
 * @returns {Promise<object>} Claim document populated with evidence
 */
export const getClaimById = async (claimId) => {
  const claim = await Claim.findById(claimId).lean();

  if (!claim) {
    const error = new Error(`Claim with ID '${claimId}' was not found`);
    error.statusCode = 404;
    error.code = 'RESOURCE_NOT_FOUND';
    throw error;
  }

  // Retrieve associated evidence items and populate referenced incident report summaries
  const evidence = await Evidence.find({ claimId })
    .populate({
      path: 'incidentReportIds',
      select: 'sourceReportId sourceName sourceType eventType title severity publishedAt'
    })
    .sort({ createdAt: 1, _id: 1 })
    .lean();

  return {
    ...claim,
    evidence
  };
};
