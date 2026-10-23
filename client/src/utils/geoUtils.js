/**
 * Geographic Coordinate & Spatial Utilities for SignalTrace
 *
 * Enforces strict boundary checks on coordinates:
 * - Latitude must be finite and within [-90, 90]
 * - Longitude must be finite and within [-180, 180]
 * - Missing or invalid coordinates are never fabricated.
 */

/**
 * Validates whether an incident has explicit, valid geographic coordinates
 * @param {object} coords - { latitude, longitude }
 * @returns {boolean}
 */
export const isValidCoordinate = (coords) => {
  if (!coords) return false;
  const { latitude, longitude } = coords;

  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
    return false;
  }

  const lat = Number(latitude);
  const lon = Number(longitude);

  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
};

/** Return the incident list exposed by the frontend API service. */
export const getIncidentRecords = (response) =>
  Array.isArray(response?.incidents) ? response.incidents : [];

/** Use only the explicit backend provenance flag; never guess from sourceName. */
export const getIncidentProvenance = (incident) => {
  if (incident?.isSynthetic === true) return 'synthetic';
  if (incident?.isSynthetic === false) return 'live';
  return 'unknown';
};

/** Describe distance as proximity only; it is not a verification result. */
export const getSpatialProximityMessage = (incident, distanceKm) => {
  const provenance = getIncidentProvenance(incident);
  const distance = Number.isFinite(distanceKm) ? `${distanceKm} km` : 'an unknown distance';

  if (provenance === 'synthetic') {
    return {
      provenanceLabel: 'DEMO / SYNTHETIC',
      message: `Matches a synthetic demonstration incident (${distance} away); this is not live confirmation. Distance measures spatial proximity only and does not verify the claim.`
    };
  }
  if (provenance === 'live') {
    return {
      provenanceLabel: 'LIVE SOURCE RECORD',
      message: `Nearest live incident record is ${distance} away. This measures spatial proximity only and does not verify the claim details.`
    };
  }
  return {
    provenanceLabel: 'PROVENANCE UNKNOWN',
    message: `Nearest incident record is ${distance} away. Provenance is unavailable; distance alone does not verify the claim.`
  };
};

/** Apply the map's visible filters to both the marker set and incident feed. */
export const filterIncidents = (
  incidents,
  { provenance = 'all', eventType = 'all', severity = 'all', timeWindow = 'all' } = {},
  referenceTime = Date.now()
) => {
  if (!Array.isArray(incidents)) return [];

  return incidents.filter((incident) => {
    if (provenance === 'live' && getIncidentProvenance(incident) !== 'live') return false;
    if (provenance === 'synthetic' && getIncidentProvenance(incident) !== 'synthetic') return false;
    if (eventType !== 'all' && incident.eventType?.toLowerCase() !== eventType.toLowerCase()) return false;
    if (severity !== 'all' && incident.severity?.toLowerCase() !== severity.toLowerCase()) return false;

    if (timeWindow !== 'all') {
      const timeValue = incident.publishedAt || incident.eventOccurredAt || incident.createdAt;
      if (!timeValue) return false;
      const incidentTime = new Date(timeValue).getTime();
      const ageMs = referenceTime - incidentTime;
      if (timeWindow === '24h' && ageMs > 24 * 60 * 60 * 1000) return false;
      if (timeWindow === '7d' && ageMs > 7 * 24 * 60 * 60 * 1000) return false;
      if (timeWindow === '30d' && ageMs > 30 * 24 * 60 * 60 * 1000) return false;
    }

    return true;
  });
};

/**
 * Format coordinates for human display with cardinal directions
 * @param {object} coords - { latitude, longitude }
 * @returns {string} E.g. "26.5420° N, 88.7190° E" or "Not available"
 */
export const formatCoordinates = (coords) => {
  if (!isValidCoordinate(coords)) return 'Not available';
  const lat = Number(coords.latitude);
  const lon = Number(coords.longitude);

  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';

  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lon).toFixed(4)}° ${lonDir}`;
};

/**
 * Computes bounding box [[minLat, minLng], [maxLat, maxLng]] for a list of incidents
 * @param {Array} incidents
 * @returns {Array|null}
 */
export const computeIncidentBounds = (incidents) => {
  if (!incidents || incidents.length === 0) return null;

  const validPoints = incidents
    .filter((inc) => isValidCoordinate(inc?.geographicInfo?.coordinates))
    .map((inc) => [
      Number(inc.geographicInfo.coordinates.latitude),
      Number(inc.geographicInfo.coordinates.longitude)
    ]);

  if (validPoints.length === 0) return null;

  let minLat = validPoints[0][0];
  let maxLat = validPoints[0][0];
  let minLng = validPoints[0][1];
  let maxLng = validPoints[0][1];

  for (const [lat, lng] of validPoints) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }

  // If only a single point or points are identical, expand by a small margin
  if (minLat === maxLat && minLng === maxLng) {
    return [
      [minLat - 0.5, minLng - 0.5],
      [maxLat + 0.5, maxLng + 0.5]
    ];
  }

  return [
    [minLat, minLng],
    [maxLat, maxLng]
  ];
};

/**
 * Get visual styling configuration for an incident based on severity
 * @param {string} severity
 * @returns {object}
 */
export const getSeverityConfig = (severity) => {
  switch (severity?.toLowerCase()) {
    case 'extreme':
      return {
        label: 'EXTREME',
        color: 'var(--accent-rose)',
        bg: 'rgba(244, 63, 94, 0.15)',
        border: 'rgba(244, 63, 94, 0.4)',
        ringColor: '#fb7185'
      };
    case 'severe':
      return {
        label: 'SEVERE',
        color: 'var(--accent-amber)',
        bg: 'rgba(245, 158, 11, 0.15)',
        border: 'rgba(245, 158, 11, 0.4)',
        ringColor: '#fbbf24'
      };
    case 'moderate':
      return {
        label: 'MODERATE',
        color: 'var(--accent-cyan)',
        bg: 'rgba(56, 189, 248, 0.15)',
        border: 'rgba(56, 189, 248, 0.4)',
        ringColor: '#38bdf8'
      };
    case 'minor':
      return {
        label: 'MINOR',
        color: 'var(--accent-emerald)',
        bg: 'rgba(52, 211, 153, 0.15)',
        border: 'rgba(52, 211, 153, 0.4)',
        ringColor: '#34d399'
      };
    default:
      return {
        label: severity ? severity.toUpperCase() : 'UNKNOWN',
        color: 'var(--text-muted)',
        bg: 'rgba(255, 255, 255, 0.05)',
        border: 'var(--border-subtle)',
        ringColor: '#94a3b8'
      };
  }
};

/**
 * Calculates great-circle distance between two coordinates in kilometers (Haversine formula)
 */
export const calculateDistanceKm = (coords1, coords2) => {
  if (!isValidCoordinate(coords1) || !isValidCoordinate(coords2)) return null;
  const R = 6371;
  const lat1 = Number(coords1.latitude);
  const lon1 = Number(coords1.longitude);
  const lat2 = Number(coords2.latitude);
  const lon2 = Number(coords2.longitude);

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

// Known emergency benchmark coordinate lookup for demo spatial awareness
const KNOWN_DISASTER_ZONES = {
  teesta: { latitude: 26.542, longitude: 88.719, label: 'Teesta River / Jalpaiguri' },
  jalpaiguri: { latitude: 26.542, longitude: 88.719, label: 'Jalpaiguri, WB' },
  chamoli: { latitude: 30.291, longitude: 79.524, label: 'Chamoli, Uttarakhand' },
  paradip: { latitude: 20.316, longitude: 86.611, label: 'Paradip Port, Odisha' },
  shimla: { latitude: 31.104, longitude: 77.173, label: 'Shimla Ridge, HP' },
  mandi: { latitude: 31.708, longitude: 76.932, label: 'Mandi / Suketi, HP' },
  supaul: { latitude: 26.126, longitude: 86.602, label: 'Kosi River / Supaul, Bihar' },
  nashik: { latitude: 19.997, longitude: 73.789, label: 'Nashik, Maharashtra' },
  houston: { latitude: 29.6805, longitude: -95.4678, label: 'Meyerland / Houston, TX (CrisisMMD)' },
  meyerland: { latitude: 29.6805, longitude: -95.4678, label: 'Meyerland / Houston, TX (CrisisMMD)' },
  paradise: { latitude: 39.7596, longitude: -121.6219, label: 'Paradise / Butte County, CA (CrisisMMD)' },
  magalia: { latitude: 39.8118, longitude: -121.5783, label: 'Magalia, CA (CrisisMMD)' },
  puebla: { latitude: 18.556, longitude: -98.484, label: 'Puebla / Central Mexico (CrisisMMD)' },
  puri: { latitude: 19.8135, longitude: 85.8312, label: 'Puri Coast, Odisha (CrisisMMD)' }
};

/**
 * Resolves approximate coordinates for an active claim from its text or location properties
 */
export const resolveClaimCoordinates = (claim) => {
  if (!claim) return null;
  if (isValidCoordinate(claim.claimedLocation?.coordinates)) {
    return {
      coordinates: claim.claimedLocation.coordinates,
      label: claim.claimedLocation.rawText || 'Claimed Location'
    };
  }

  const rawText = (claim.rawText || claim.originalText || '').toLowerCase();
  for (const [key, zone] of Object.entries(KNOWN_DISASTER_ZONES)) {
    if (rawText.includes(key)) {
      return {
        coordinates: { latitude: zone.latitude, longitude: zone.longitude },
        label: zone.label
      };
    }
  }

  return null;
};
