import { config } from '../../config/env.js';
import { extractWithFallback } from './fallbackExtractor.js';
import { extractWithLLM } from './llmExtractor.js';
import { validateExtractedClaims } from './validator.js';

export const MAX_TEXT_LENGTH = 2000;
export const MIN_TEXT_LENGTH = 5;

/**
 * Validates and normalizes raw input text
 * @param {string} rawText
 * @returns {string} Cleaned, trimmed text
 */
export const validateInputText = (rawText) => {
  if (rawText === undefined || rawText === null) {
    const error = new Error('Field "text" is required');
    error.statusCode = 400;
    error.code = 'INVALID_INPUT_TEXT';
    throw error;
  }

  if (typeof rawText !== 'string') {
    const error = new Error('Field "text" must be a string');
    error.statusCode = 400;
    error.code = 'INVALID_INPUT_TEXT';
    throw error;
  }

  const trimmed = rawText.trim();
  if (trimmed.length === 0) {
    const error = new Error('Field "text" cannot be empty or whitespace-only');
    error.statusCode = 400;
    error.code = 'INVALID_INPUT_TEXT';
    throw error;
  }

  if (trimmed.length < MIN_TEXT_LENGTH) {
    const error = new Error(`Field "text" must be at least ${MIN_TEXT_LENGTH} characters long`);
    error.statusCode = 400;
    error.code = 'TEXT_TOO_SHORT';
    throw error;
  }

  if (trimmed.length > MAX_TEXT_LENGTH) {
    const error = new Error(`Field "text" exceeds maximum allowed length of ${MAX_TEXT_LENGTH} characters`);
    error.statusCode = 400;
    error.code = 'TEXT_TOO_LONG';
    throw error;
  }

  return trimmed;
};

/**
 * High-level atomic claim extraction coordinator
 * @param {string} text - Raw post text
 * @param {object} [options] - Optional extraction configuration
 * @returns {Promise<{ claims: Array<object>, method: string }>}
 */
export const extractAtomicClaims = async (text, options = {}) => {
  const normalizedText = validateInputText(text);

  const provider = options.provider || config.llmProvider;
  const apiKey = options.apiKey || config.llmApiKey;
  const forceFallback = options.forceFallback || false;

  let rawClaims = [];
  let extractionMethod = 'deterministic_fallback';

  // If LLM provider is explicitly enabled and API key is present
  if (!forceFallback && provider !== 'fallback' && apiKey) {
    try {
      rawClaims = await extractWithLLM(normalizedText, options);
      extractionMethod = 'llm';
    } catch (llmError) {
      console.warn(`[Extraction Warning] LLM extraction failed (${llmError.message}). Falling back to deterministic sentence splitting.`);
      rawClaims = extractWithFallback(normalizedText);
      extractionMethod = 'deterministic_fallback';
    }
  } else {
    // Deterministic fallback path
    rawClaims = extractWithFallback(normalizedText);
    extractionMethod = 'deterministic_fallback';
  }

  // Validate and normalize candidate claims
  const validatedClaims = validateExtractedClaims(rawClaims, normalizedText);

  return {
    claims: validatedClaims,
    method: extractionMethod,
    originalText: normalizedText
  };
};
