/**
 * SignalTrace — Authoritative Disaster Feed Adapter
 * Provider: Global Disaster Alert and Coordination System (GDACS - UN / European Commission)
 *
 * Official Portal:
 *   https://www.gdacs.org/
 *
 * Feed Characteristics:
 *   - Access: Public multi-hazard feed, free, no API key required
 *   - Event Types: Flood ('flood'), Tropical Cyclone ('cyclone'), Earthquake ('earthquake'), Wildfire ('wildfire')
 *   - Source Type: Official Agency / Humanitarian System ('official_agency')
 *   - Geographic Coverage: Global multi-hazard monitoring
 *   - Coordinate System: WGS84 GeoJSON [longitude, latitude]
 */

import { config } from '../../../config/env.js';

export const GDACS_SOURCE_NAME = 'Global Disaster Alert and Coordination System (GDACS)';
export const GDACS_SOURCE_TYPE = 'official_agency';

/**
 * Maps GDACS alert levels ('Green', 'Orange', 'Red') to IncidentReport severity enum:
 * 'minor' | 'moderate' | 'severe' | 'extreme' | 'unknown'
 */
export const mapGdacsSeverity = (alertlevel) => {
  if (!alertlevel) return 'moderate';
  const level = String(alertlevel).toLowerCase();
  if (level === 'red') return 'extreme';
  if (level === 'orange') return 'severe';
  if (level === 'yellow' || level === 'green') return 'moderate';
  return 'minor';
};

/**
 * Maps GDACS event type codes to IncidentReport eventType enum
 */
export const mapGdacsEventType = (eventtype) => {
  if (!eventtype) return 'other';
  const type = String(eventtype).toUpperCase();
  switch (type) {
    case 'FL':
      return 'flood';
    case 'TC':
      return 'cyclone';
    case 'EQ':
      return 'earthquake';
    case 'WF':
    case 'FF':
      return 'wildfire';
    case 'LS':
      return 'landslide';
    default:
      return 'other';
  }
};

/**
 * Validates an incoming GDACS event item
 */
export const validateFeature = (item) => {
  if (!item || typeof item !== 'object') {
    return { valid: false, error: 'Item must be a non-null object' };
  }

  const id = item.eventid || item.id || item.properties?.eventid || item.properties?.id;
  if (!id) {
    return { valid: false, error: 'GDACS event is missing eventid' };
  }

  return { valid: true };
};

/**
 * Normalizes a GDACS event item into the standard IncidentReport schema
 */
export const normalizeFeature = (item, retrievedAt = new Date()) => {
  const props = item.properties || item;
  const eventId = String(item.eventid || item.id || props.eventid || props.id);
  const rawEventType = props.eventtype || props.type || 'FL';
  const eventType = mapGdacsEventType(rawEventType);
  const alertLevel = props.alertlevel || props.alert_level || 'Orange';
  const severity = mapGdacsSeverity(alertLevel);

  const title =
    props.name ||
    props.eventname ||
    props.title ||
    `[GDACS] ${alertLevel} Alert: ${eventType.toUpperCase()} Event #${eventId}`;

  const description = props.description || props.htmldescription || title;

  // Coordinates extraction
  let latitude = null;
  let longitude = null;

  if (item.geometry?.coordinates && Array.isArray(item.geometry.coordinates)) {
    longitude = Number(item.geometry.coordinates[0]);
    latitude = Number(item.geometry.coordinates[1]);
  } else if (props.latitude !== undefined && props.longitude !== undefined) {
    latitude = Number(props.latitude);
    longitude = Number(props.longitude);
  } else if (props.lat !== undefined && props.lon !== undefined) {
    latitude = Number(props.lat);
    longitude = Number(props.lon);
  }

  const hasCoords =
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  const publishedValue = props.publishedAt || props.pubdate || props.updated || null;
  const occurredValue = props.fromdate || props.date || null;
  const publishedAt = publishedValue && Number.isFinite(new Date(publishedValue).getTime())
    ? new Date(publishedValue)
    : null;
  const eventOccurredAt = occurredValue && Number.isFinite(new Date(occurredValue).getTime())
    ? new Date(occurredValue)
    : null;
  const rawUrl = typeof props.url === 'string' ? props.url : (props.url?.report || props.url?.details || null);
  const resolvedUrl = typeof rawUrl === 'string' && /^https?:\/\//i.test(rawUrl) ? rawUrl : null;

  return {
    sourceReportId: `GDACS-${eventId}`,
    sourceName: GDACS_SOURCE_NAME,
    sourceType: GDACS_SOURCE_TYPE,
    sourceUrl: resolvedUrl,
    eventType,
    title,
    description: description.replace(/<[^>]*>?/gm, '').trim(),
    severity,
    geographicInfo: {
      locationName: props.country ? `${props.country} Sector` : props.name || 'Impacted Area',
      adminRegion: props.country || null,
      country: props.country || null,
      coordinates: hasCoords ? { latitude, longitude } : null,
      affectedRadiusKm: props.affected_radius ? Number(props.affected_radius) : null,
      affectedAreaDescription: props.country ? `Monitored emergency area in ${props.country}` : null
    },
    publishedAt,
    updatedAtSource: props.updated && Number.isFinite(new Date(props.updated).getTime()) ? new Date(props.updated) : null,
    eventOccurredAt,
    retrievedAt,
    rawPayload: {
      eventId,
      alertLevel,
      rawEventType,
      country: props.country || null
    },
    isSynthetic: false
  };
};

/**
 * Fetches the GDACS feed. A failed fetch remains a failed fetch; it is never
 * replaced with fabricated records labeled as official GDACS data.
 */
export const fetchFeed = async (options = {}) => {
  const feedUrl = options.feedUrl || config.gdacsFeedUrl;
  const timeoutMs = options.timeoutMs || config.ingestionTimeoutMs || 10000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(feedUrl, {
      method: 'GET',
      headers: { Accept: 'application/json, application/geo+json' },
      signal: controller.signal
    });

    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`GDACS server responded with status HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data.features && Array.isArray(data.features)) {
      return data.features;
    }
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  } catch (err) {
    clearTimeout(timer);
    throw new Error(`GDACS feed unavailable: ${err.message}`, { cause: err });
  }
};

export const gdacsAdapter = {
  sourceName: GDACS_SOURCE_NAME,
  sourceType: GDACS_SOURCE_TYPE,
  mapSeverity: mapGdacsSeverity,
  mapEventType: mapGdacsEventType,
  validateFeature,
  normalizeFeature,
  fetchFeed
};

export default gdacsAdapter;
