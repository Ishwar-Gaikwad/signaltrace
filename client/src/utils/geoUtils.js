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
