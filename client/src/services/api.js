/**
 * API Service for SignalTrace Client
 * Handles communication with the backend REST API
 */

// Resolves API base URL from Vite environment or falls back to relative '/api'
const rawApiUrl = import.meta.env.VITE_API_URL || '/api';
export const API_BASE_URL = rawApiUrl.replace(/\/+$/, '');

/**
 * Custom error class for API failures
 */
export class ApiError extends Error {
  constructor(message, status = null, code = null, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Checks backend health status from GET /api/health
 * @param {number} timeoutMs - Timeout limit in milliseconds
 * @returns {Promise<object>} Parsed health response data
 */
export const fetchHealth = async (timeoutMs = 6000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const endpoint = `${API_BASE_URL}/health`;

  try {
    const startTime = performance.now();
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      },
      signal: controller.signal
    });

    const latencyMs = Math.round(performance.now() - startTime);

    let json;
    try {
      json = await response.json();
    } catch {
      throw new ApiError(`Invalid JSON received from ${endpoint}`, response.status);
    }

    if (!response.ok || !json.success) {
      const errorMessage = json?.error?.message || `Server responded with HTTP ${response.status}`;
      const errorCode = json?.error?.code || 'HTTP_ERROR';
      throw new ApiError(errorMessage, response.status, errorCode, json?.error?.details);
    }

    return {
      success: true,
      data: json.data,
      raw: json,
      latencyMs,
      endpoint
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError(`Request to ${endpoint} timed out after ${timeoutMs}ms`, 408, 'TIMEOUT');
    }
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(err.message || 'Network error: Backend server unreachable', null, 'NETWORK_ERROR');
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Submits a disaster-related post to POST /api/claims/extract for atomic claim decomposition
 * @param {object} payload - { text, sourcePlatform, authorId }
 * @param {number} timeoutMs - Timeout limit in milliseconds
 * @returns {Promise<object>} Parsed response envelope containing saved claim and atomic claims
 */
export const extractClaims = async (payload, timeoutMs = 12000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const endpoint = `${API_BASE_URL}/claims/extract`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    let json;
    try {
      json = await response.json();
    } catch {
      throw new ApiError(`Invalid JSON received from ${endpoint}`, response.status);
    }

    if (!response.ok || !json.success) {
      const errorMessage = json?.error?.message || `Extraction failed with HTTP ${response.status}`;
      const errorCode = json?.error?.code || 'EXTRACTION_ERROR';
      throw new ApiError(errorMessage, response.status, errorCode, json?.error?.details);
    }

    return json;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError(`Request to ${endpoint} timed out after ${timeoutMs}ms`, 408, 'TIMEOUT');
    }
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(err.message || 'Network error: Backend server unreachable', null, 'NETWORK_ERROR');
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Runs the deterministic verification engine on a persisted claim via POST /api/claims/:id/verify
 * @param {string} claimId - MongoDB ObjectId of the persisted claim
 * @param {number} timeoutMs - Timeout limit in milliseconds
 * @returns {Promise<object>} Parsed response envelope with verificationResults in meta
 */
export const verifyClaim = async (claimId, timeoutMs = 15000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const endpoint = `${API_BASE_URL}/claims/${claimId}/verify`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      signal: controller.signal
    });

    let json;
    try {
      json = await response.json();
    } catch {
      throw new ApiError(`Invalid JSON received from ${endpoint}`, response.status);
    }

    if (!response.ok || !json.success) {
      const errorMessage = json?.error?.message || `Verification failed with HTTP ${response.status}`;
      const errorCode = json?.error?.code || 'VERIFICATION_ERROR';
      throw new ApiError(errorMessage, response.status, errorCode, json?.error?.details);
    }

    return json;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError(`Request to ${endpoint} timed out after ${timeoutMs}ms`, 408, 'TIMEOUT');
    }
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(err.message || 'Network error: Backend server unreachable', null, 'NETWORK_ERROR');
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Retrieves a paginated list of claims with optional status and verdict filtering
 * @param {object} [params] - { page, limit, status, verdict }
 * @param {number} [timeoutMs=10000] - Request timeout limit
 * @returns {Promise<{ claims: Array, meta: object }>}
 */
export const fetchClaims = async ({ page = 1, limit = 10, status = null, verdict = null } = {}, timeoutMs = 10000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const queryParams = new URLSearchParams();
  queryParams.append('page', String(page));
  queryParams.append('limit', String(limit));
  if (status) queryParams.append('status', status);
  if (verdict) queryParams.append('verdict', verdict);

  const endpoint = `${API_BASE_URL}/claims?${queryParams.toString()}`;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });

    let json;
    try {
      json = await response.json();
    } catch {
      throw new ApiError(`Invalid JSON received from ${endpoint}`, response.status);
    }

    if (!response.ok || !json.success) {
      const errorMessage = json?.error?.message || `Failed to fetch claims: HTTP ${response.status}`;
      const errorCode = json?.error?.code || 'FETCH_CLAIMS_ERROR';
      throw new ApiError(errorMessage, response.status, errorCode, json?.error?.details);
    }

    return {
      claims: json.data || [],
      meta: json.meta || {}
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError(`Request to ${endpoint} timed out after ${timeoutMs}ms`, 408, 'TIMEOUT');
    }
    if (err instanceof ApiError) throw err;
    throw new ApiError(err.message || 'Network error: Unable to retrieve claims', null, 'NETWORK_ERROR');
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Retrieves a single claim by its MongoDB ObjectId, including atomic claims and evidence
 * @param {string} claimId - 24-character hexadecimal ObjectId
 * @param {number} [timeoutMs=10000]
 * @returns {Promise<object>} Full claim document with evidence
 */
export const fetchClaimById = async (claimId, timeoutMs = 10000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const endpoint = `${API_BASE_URL}/claims/${claimId}`;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });

    let json;
    try {
      json = await response.json();
    } catch {
      throw new ApiError(`Invalid JSON received from ${endpoint}`, response.status);
    }

    if (!response.ok || !json.success) {
      const errorMessage = json?.error?.message || `Failed to fetch claim ${claimId}: HTTP ${response.status}`;
      const errorCode = json?.error?.code || 'FETCH_CLAIM_ERROR';
      throw new ApiError(errorMessage, response.status, errorCode, json?.error?.details);
    }

    return json.data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError(`Request to ${endpoint} timed out after ${timeoutMs}ms`, 408, 'TIMEOUT');
    }
    if (err instanceof ApiError) throw err;
    throw new ApiError(err.message || 'Network error: Unable to retrieve claim', null, 'NETWORK_ERROR');
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Retrieves a paginated list of authoritative and synthetic incident reports
 * @param {object} [params] - { page, limit, eventType, severity, isSynthetic, sourceName }
 * @param {number} [timeoutMs=10000]
 * @returns {Promise<{ incidents: Array, meta: object }>}
 */
export const fetchIncidents = async ({
  page = 1,
  limit = 10,
  eventType = null,
  severity = null,
  isSynthetic = null,
  sourceName = null
} = {}, timeoutMs = 10000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const queryParams = new URLSearchParams();
  queryParams.append('page', String(page));
  queryParams.append('limit', String(limit));
  if (eventType) queryParams.append('eventType', eventType);
  if (severity) queryParams.append('severity', severity);
  if (isSynthetic !== null && isSynthetic !== undefined) queryParams.append('isSynthetic', String(isSynthetic));
  if (sourceName) queryParams.append('sourceName', sourceName);

  const endpoint = `${API_BASE_URL}/incidents?${queryParams.toString()}`;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });

    let json;
    try {
      json = await response.json();
    } catch {
      throw new ApiError(`Invalid JSON received from ${endpoint}`, response.status);
    }

    if (!response.ok || !json.success) {
      const errorMessage = json?.error?.message || `Failed to fetch incidents: HTTP ${response.status}`;
      const errorCode = json?.error?.code || 'FETCH_INCIDENTS_ERROR';
      throw new ApiError(errorMessage, response.status, errorCode, json?.error?.details);
    }

    return {
      incidents: json.data || [],
      meta: json.meta || {}
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError(`Request to ${endpoint} timed out after ${timeoutMs}ms`, 408, 'TIMEOUT');
    }
    if (err instanceof ApiError) throw err;
    throw new ApiError(err.message || 'Network error: Unable to retrieve incidents', null, 'NETWORK_ERROR');
  } finally {
    clearTimeout(timeoutId);
  }
};
