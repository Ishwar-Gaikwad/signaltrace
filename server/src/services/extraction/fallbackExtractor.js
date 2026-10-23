/**
 * Deterministic Fallback Extractor
 *
 * Implements sentence-level decomposition when an LLM provider is not configured.
 * NOTE: As per Phase 3 specifications, this fallback explicitly does NOT pretend
 * to perform advanced semantic reasoning or fabricated entity recognition.
 * All uncertain/unknown values remain null or empty.
 */

// Regex for sentence boundary splitting while handling numbers and common abbreviations
const SENTENCE_SPLIT_REGEX = /(?<=[.?!;])\s+(?=[A-Z0-9"']|$)/g;

/**
 * Splits post text into discrete sentence segments with exact character spans
 * @param {string} text - Cleaned post text
 * @returns {Array<object>} Array of atomic claims from sentence splitting
 */
export const extractWithFallback = (text) => {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return [];
  }

  // Find sentences and their index offsets within the original text
  const sentences = [];
  let remainingText = text;
  let cursor = 0;

  // Split text by sentence boundaries or newline breaks
  const rawSegments = trimmed.split(/\n+/).flatMap((line) => line.split(SENTENCE_SPLIT_REGEX));

  for (const rawSegment of rawSegments) {
    const cleanSegment = rawSegment.trim();
    if (cleanSegment.length < 3) continue;

    const startOffset = text.indexOf(cleanSegment, cursor);
    const endOffset = startOffset !== -1 ? startOffset + cleanSegment.length : null;
    if (startOffset !== -1) {
      cursor = endOffset;
    }

    sentences.push({
      segmentText: cleanSegment,
      startOffset: startOffset !== -1 ? startOffset : null,
      endOffset
    });
  }

  // If no punctuation was found or splitting yielded nothing, treat entire text as single claim
  if (sentences.length === 0) {
    sentences.push({
      segmentText: trimmed,
      startOffset: text.indexOf(trimmed),
      endOffset: text.indexOf(trimmed) + trimmed.length
    });
  }

  return sentences.map((item, index) => ({
    atomicClaimId: `ac-${index + 1}`,
    text: item.segmentText,
    claimText: item.segmentText,
    claimType: 'other', // explicitly 'other' — fallback does not invent semantic categorization
    entities: [], // explicitly empty — fallback does not perform NLP NER
    location: null, // explicitly null — fallback does not invent geographic coordinates
    claimedLocation: null,
    eventTime: null,
    claimedTimestamp: null,
    attribution: null,
    uncertainty: {
      isUncertain: false,
      qualification: null
    },
    sourceSpan: {
      text: item.segmentText,
      startOffset: item.startOffset,
      endOffset: item.endOffset
    },
    extractionMethod: 'deterministic_fallback'
  }));
};
