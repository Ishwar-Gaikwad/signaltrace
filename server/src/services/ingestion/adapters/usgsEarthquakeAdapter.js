/**
 * SignalTrace — Phase 5: Authoritative Disaster Feed Adapter
 * Provider: USGS Earthquake Hazards Program (GeoJSON API)
 *
 * Official Documentation:
 *   https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php
 *
 * Feed Characteristics:
 *   - Access: Public GeoJSON feed, free, no authentication/API key required
 *   - Event Type: Earthquake ('earthquake')
 *   - Source Type: Geological Survey ('geological_survey')
 *   - Geographic Coverage: Global real-time seismological observation
 *   - Coordinate System: WGS84 GeoJSON [longitude, latitude, depth]
 */

import { config } from '../../../config/env.js';

export const USGS_SOURCE_NAME = 'USGS Earthquake Hazards Program';
export const USGS_SOURCE_TYPE = 'geological_survey';

/**
 * Maps earthquake magnitude and optional alert level to IncidentReport severity enum:
 * 'minor' | 'moderate' | 'severe' | 'extreme' | 'unknown'
 *
 * @param {number|null} mag - Earthquake magnitude
 * @param {string|null} alert - USGS PAGER alert color ('green', 'yellow', 'orange', 'red')
 * @returns {'minor'|'moderate'|'severe'|'extreme'|'unknown'}
 */
export const mapSeverity = (mag, alert = null) => {
  if (alert) {
    const alertLower = String(alert).toLowerCase();
    if (alertLower === 'red') return 'extreme';
    if (alertLower === 'orange') return 'severe';
    if (alertLower === 'yellow') return 'moderate';
    if (alertLower === 'green') return 'minor';
  }

  if (typeof mag !== 'number' || isNaN(mag)) {
    return 'unknown';
  }

  if (mag >= 7.0) return 'extreme';
  if (mag >= 6.0) return 'severe';
  if (mag >= 4.5) return 'moderate';
  if (mag >= 0) return 'minor';
  return 'unknown';
};

/**
 * Validates an incoming GeoJSON feature from the USGS feed.
 *
 * @param {unknown} feature
 * @returns {{ valid: boolean, error?: string }}
 */
export const validateFeature = (feature) => {
  if (!feature || typeof feature !== 'object') {
    return { valid: false, error: 'Feature must be a non-null object' };
  }

  if (!feature.id || typeof feature.id !== 'string' || !feature.id.trim()) {
    return { valid: false, error: 'Feature id is missing or empty' };
  }

  if (!feature.properties || typeof feature.properties !== 'object') {
    return { valid: false, error: 'Feature properties object is missing' };
  }

  const { time } = feature.properties;
  if (time === undefined || time === null) {
    return { valid: false, error: 'Feature properties.time is required' };
  }

  const timeNum = Number(time);
  if (isNaN(timeNum) || timeNum <= 0) {
    return { valid: false, error: `Invalid feature properties.time: ${time}` };
  }

  return { valid: true };
};

/**
 * Normalizes a validated GeoJSON feature into the IncidentReport schema structure.
 *
 * NOTE: Preserves source-provided values. Does not fabricate missing geographic
 * coordinates, admin regions, or affected radii.
 *
 * @param {object} feature - Validated GeoJSON Feature object
 * @param {Date} [retrievedAt=new Date()] - Ingestion timestamp
 * @returns {object} Plain JavaScript object matching IncidentReport schema
 */
export const normalizeFeature = (feature, retrievedAt = new Date()) => {
  const { id, properties = {}, geometry } = feature;
  const {
    mag = null,
    place = null,
    time = null,
    updated = null,
    url = null,
    status = 'automatic',
    magType = null,
    alert = null
  } = properties;

  // Coordinate extraction: GeoJSON is [longitude, latitude, depth]
  let coordinates = null;
  let depthKm = null;

  if (
    geometry &&
    geometry.type === 'Point' &&
    Array.isArray(geometry.coordinates) &&
    geometry.coordinates.length >= 2
  ) {
    const [lon, lat, depth] = geometry.coordinates;
    const lonNum = Number(lon);
    const latNum = Number(lat);

    if (
      !isNaN(latNum) &&
      !isNaN(lonNum) &&
      latNum >= -90 &&
      latNum <= 90 &&
      lonNum >= -180 &&
      lonNum <= 180
    ) {
      coordinates = {
        latitude: Number(latNum.toFixed(4)),
        longitude: Number(lonNum.toFixed(4))
      };
    }

    if (depth !== undefined && depth !== null && !isNaN(Number(depth))) {
      depthKm = Number(Number(depth).toFixed(2));
    }
  }

  const magFormatted = typeof mag === 'number' && !isNaN(mag) ? mag.toFixed(1) : 'Unknown';
  const locationFormatted = place ? place.trim() : 'Unspecified region';
  const title = properties.title ? properties.title.trim() : `M ${magFormatted} - ${locationFormatted}`;

  const eventTimeIso = time ? new Date(time).toISOString() : 'Unknown';
  const description =
    `USGS reported earthquake of magnitude ${magFormatted} near ${locationFormatted}. ` +
    `Event time: ${eventTimeIso}. ` +
    (depthKm !== null ? `Depth: ${depthKm} km. ` : '') +
    `Review status: ${status}.`;

  const severity = mapSeverity(mag, alert);

  return {
    sourceReportId: String(id).trim(),
    sourceName: USGS_SOURCE_NAME,
    sourceType: USGS_SOURCE_TYPE,
    sourceUrl: url && typeof url === 'string' ? url.trim() : null,
    eventType: 'earthquake',
    title,
    description,
    severity,
    geographicInfo: {
      locationName: locationFormatted,
      adminRegion: null, // Source does not provide normalized admin region; do not fabricate
      country: null,     // Source provides free-text place; do not fabricate country code
      coordinates,
      affectedRadiusKm: null, // Not provided by source; do not fabricate
      affectedAreaDescription: locationFormatted
    },
    publishedAt: time ? new Date(time) : null,
    updatedAtSource: updated ? new Date(updated) : null,
    eventOccurredAt: time ? new Date(time) : null,
    retrievedAt: retrievedAt instanceof Date ? retrievedAt : new Date(retrievedAt),
    rawPayload: {
      mag,
      place,
      time,
      updated,
      url,
      status,
      magType,
      alert,
      depthKm
    },
    isSynthetic: false
  };
};

/**
 * Fetches and returns raw features from the USGS GeoJSON feed.
 *
 * @param {object} [options]
 * @param {string} [options.feedUrl] - Override default feed URL
 * @param {number} [options.timeoutMs] - Request timeout in milliseconds
 * @param {number} [options.maxRecords] - Maximum features to return
 * @returns {Promise<Array<object>>} Array of raw GeoJSON feature objects
 */
export const fetchFeed = async ({
  feedUrl = config.usgsFeedUrl,
  timeoutMs = config.ingestionTimeoutMs,
  maxRecords = config.ingestionMaxRecords
} = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(feedUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SignalTrace-DisasterVerifier/1.0'
      }
    });

    if (!response.ok) {
      const error = new Error(`USGS HTTP Error ${response.status}: ${response.statusText}`);
      error.statusCode = response.status;
      error.code = 'FEED_FETCH_HTTP_ERROR';
      throw error;
    }

    const payload = await response.json();

    if (!payload || typeof payload !== 'object' || payload.type !== 'FeatureCollection') {
      const error = new Error('Invalid GeoJSON payload: root must be a FeatureCollection');
      error.code = 'FEED_MALFORMED_PAYLOAD';
      throw error;
    }

    if (!Array.isArray(payload.features)) {
      const error = new Error('Invalid GeoJSON payload: features array missing');
      error.code = 'FEED_MALFORMED_PAYLOAD';
      throw error;
    }

    const features = payload.features;
    if (typeof maxRecords === 'number' && maxRecords > 0) {
      return features.slice(0, maxRecords);
    }
    return features;
  } catch (err) {
    if (err.name === 'AbortError') {
      const error = new Error(`USGS feed request timed out after ${timeoutMs}ms`);
      error.code = 'FEED_TIMEOUT';
      throw error;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
};

export const usgsEarthquakeAdapter = {
  adapterId: 'usgs_earthquake',
  sourceName: USGS_SOURCE_NAME,
  sourceType: USGS_SOURCE_TYPE,
  fetchFeed,
  validateFeature,
  normalizeFeature,
  mapSeverity
};

export default usgsEarthquakeAdapter;
