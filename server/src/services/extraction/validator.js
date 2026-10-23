const ALLOWED_CLAIM_TYPES = new Set(['event', 'casualty', 'damage', 'evacuation', 'location', 'other']);
const ALLOWED_ENTITY_CATEGORIES = new Set([
  'location',
  'organization',
  'quantity',
  'person',
  'date_time',
  'hazard',
  'other'
]);

/**
 * Validates and normalizes structured claims output from an extractor
 * @param {Array<object>} rawClaims - Extracted claims candidate array
 * @param {string} originalText - Original post text for span cross-referencing
 * @returns {Array<object>} Validated and normalized atomic claims
 */
export const validateExtractedClaims = (rawClaims, originalText = '') => {
  if (!Array.isArray(rawClaims) || rawClaims.length === 0) {
    throw new Error('Extractor output must be a non-empty array of atomic claims');
  }

  return rawClaims.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Atomic claim at index ${index} must be a valid object`);
    }

    const text = typeof item.text === 'string' ? item.text.trim() : typeof item.claimText === 'string' ? item.claimText.trim() : '';
    if (!text || text.length < 3) {
      throw new Error(`Atomic claim at index ${index} has empty or invalid text`);
    }

    // Validate or default claimType
    let claimType = 'other';
    if (typeof item.claimType === 'string') {
      const normalizedType = item.claimType.trim().toLowerCase();
      if (ALLOWED_CLAIM_TYPES.has(normalizedType)) {
        claimType = normalizedType;
      }
    }

    // Validate entities
    const entities = Array.isArray(item.entities)
      ? item.entities
          .filter((e) => e && typeof e === 'object' && typeof e.name === 'string' && e.name.trim().length > 0)
          .map((e) => ({
            name: e.name.trim(),
            category: ALLOWED_ENTITY_CATEGORIES.has((e.category || '').toLowerCase())
              ? (e.category || '').toLowerCase()
              : 'other'
          }))
      : [];

    // Validate location without inventing
    let location = null;
    if (item.location && typeof item.location === 'object') {
      location = {
        rawText: typeof item.location.rawText === 'string' ? item.location.rawText.trim() : null,
        city: typeof item.location.city === 'string' ? item.location.city.trim() : null,
        region: typeof item.location.region === 'string' ? item.location.region.trim() : null,
        country: typeof item.location.country === 'string' ? item.location.country.trim() : null,
        coordinates:
          item.location.coordinates &&
          typeof item.location.coordinates.latitude === 'number' &&
          typeof item.location.coordinates.longitude === 'number'
            ? {
                latitude: item.location.coordinates.latitude,
                longitude: item.location.coordinates.longitude
              }
            : null
      };
      // If every field is null, discard location
      if (!location.rawText && !location.city && !location.region && !location.country && !location.coordinates) {
        location = null;
      }
    }

    // Validate uncertainty
    let uncertainty = { isUncertain: false, qualification: null };
    if (typeof item.uncertainty === 'boolean') {
      uncertainty = { isUncertain: item.uncertainty, qualification: null };
    } else if (item.uncertainty && typeof item.uncertainty === 'object') {
      uncertainty = {
        isUncertain: Boolean(item.uncertainty.isUncertain),
        qualification: typeof item.uncertainty.qualification === 'string' ? item.uncertainty.qualification.trim() : null
      };
    }

    // Validate source span
    let sourceSpan = null;
    if (item.sourceSpan && typeof item.sourceSpan === 'object') {
      const spanText = typeof item.sourceSpan.text === 'string' ? item.sourceSpan.text.trim() : null;
      const startOffset = typeof item.sourceSpan.startOffset === 'number' ? item.sourceSpan.startOffset : null;
      const endOffset = typeof item.sourceSpan.endOffset === 'number' ? item.sourceSpan.endOffset : null;
      sourceSpan = { text: spanText, startOffset, endOffset };
    } else if (originalText) {
      // Find span in original text if possible
      const start = originalText.indexOf(text);
      if (start !== -1) {
        sourceSpan = {
          text,
          startOffset: start,
          endOffset: start + text.length
        };
      }
    }

    const atomicClaimId = item.atomicClaimId || `ac-${index + 1}`;
    const extractionMethod = item.extractionMethod || 'deterministic_fallback';

    return {
      atomicClaimId,
      text,
      claimText: text,
      claimType,
      entities,
      location,
      claimedLocation: location,
      eventTime: item.eventTime || null,
      claimedTimestamp: item.claimedTimestamp || null,
      attribution: typeof item.attribution === 'string' && item.attribution.trim().length > 0 ? item.attribution.trim() : null,
      uncertainty,
      sourceSpan,
      extractionMethod,
      subject: item.subject || null,
      predicate: item.predicate || null,
      object: item.object || null
    };
  });
};
