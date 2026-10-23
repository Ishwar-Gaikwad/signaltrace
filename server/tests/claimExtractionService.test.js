import { describe, it, expect, vi } from 'vitest';
import {
  extractAtomicClaims,
  validateInputText,
  MAX_TEXT_LENGTH,
  MIN_TEXT_LENGTH
} from '../src/services/extraction/claimExtraction.service.js';
import { extractWithFallback } from '../src/services/extraction/fallbackExtractor.js';
import { extractWithLLM } from '../src/services/extraction/llmExtractor.js';
import { validateExtractedClaims } from '../src/services/extraction/validator.js';

describe('Phase 3 — Claim Extraction Service Unit Tests', () => {
  describe('Input Validation & Normalization', () => {
    it('should reject missing or non-string input text', () => {
      expect(() => validateInputText(undefined)).toThrowError(/required/);
      expect(() => validateInputText(null)).toThrowError(/required/);
      expect(() => validateInputText(12345)).toThrowError(/must be a string/);
    });

    it('should reject empty or whitespace-only input text', () => {
      expect(() => validateInputText('')).toThrowError(/cannot be empty/);
      expect(() => validateInputText('   \n\t   ')).toThrowError(/cannot be empty/);
    });

    it('should reject text shorter than minimum length', () => {
      expect(() => validateInputText('abc')).toThrowError(/at least 5 characters/);
    });

    it('should reject text exceeding maximum length', () => {
      const oversizedText = 'A'.repeat(MAX_TEXT_LENGTH + 1);
      expect(() => validateInputText(oversizedText)).toThrowError(/exceeds maximum allowed length/);
    });

    it('should trim and accept valid text within length bounds', () => {
      const raw = '   Flooding in Nashik has submerged two bridges.   ';
      const validated = validateInputText(raw);
      expect(validated).toBe('Flooding in Nashik has submerged two bridges.');
    });
  });

  describe('Deterministic Sentence-Level Fallback Extractor', () => {
    it('should split a multi-sentence disaster post into discrete atomic claims', () => {
      const text =
        'Flooding has submerged three villages near Nashik. The main bridge collapsed yesterday. 200 families have been evacuated.';
      const result = extractWithFallback(text);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);

      expect(result[0].text).toBe('Flooding has submerged three villages near Nashik.');
      expect(result[0].atomicClaimId).toBe('ac-1');
      expect(result[0].extractionMethod).toBe('deterministic_fallback');

      expect(result[1].text).toBe('The main bridge collapsed yesterday.');
      expect(result[1].atomicClaimId).toBe('ac-2');

      expect(result[2].text).toBe('200 families have been evacuated.');
      expect(result[2].atomicClaimId).toBe('ac-3');
    });

    it('should handle a single-claim post without spurious splitting', () => {
      const text = 'Heavy rainfall continues across the coastal belt of Ratnagiri.';
      const result = extractWithFallback(text);

      expect(result.length).toBe(1);
      expect(result[0].text).toBe(text);
      expect(result[0].sourceSpan.startOffset).toBe(0);
      expect(result[0].sourceSpan.endOffset).toBe(text.length);
    });

    it('should calculate accurate sourceSpan offsets for each sentence', () => {
      const text = 'Dam spillway was opened at noon. River levels are rising rapidly.';
      const result = extractWithFallback(text);

      expect(result.length).toBe(2);
      expect(result[0].sourceSpan.text).toBe('Dam spillway was opened at noon.');
      expect(text.substring(result[0].sourceSpan.startOffset, result[0].sourceSpan.endOffset)).toBe(
        'Dam spillway was opened at noon.'
      );

      expect(result[1].sourceSpan.text).toBe('River levels are rising rapidly.');
      expect(text.substring(result[1].sourceSpan.startOffset, result[1].sourceSpan.endOffset)).toBe(
        'River levels are rising rapidly.'
      );
    });

    it('should strictly NOT fabricate location, dates, quantities, or attribution in fallback mode', () => {
      const text = 'Volunteers report that about 50 houses in Wardha collapsed during midnight rains.';
      const result = extractWithFallback(text);

      expect(result.length).toBe(1);
      const claim = result[0];
      // Fallback preserves unknown fields as null or empty — never hallucinates
      expect(claim.location).toBeNull();
      expect(claim.claimedLocation).toBeNull();
      expect(claim.eventTime).toBeNull();
      expect(claim.attribution).toBeNull();
      expect(claim.entities).toEqual([]);
      expect(claim.claimType).toBe('other');
      expect(claim.uncertainty.isUncertain).toBe(false);
    });
  });

  describe('Validator Output Guardrails', () => {
    it('should throw when extractor output is not an array or is empty', () => {
      expect(() => validateExtractedClaims([])).toThrowError(/non-empty array/);
      expect(() => validateExtractedClaims(null)).toThrowError(/non-empty array/);
      expect(() => validateExtractedClaims({})).toThrowError(/non-empty array/);
    });

    it('should throw if any item has missing or invalid text', () => {
      const malformedClaims = [{ text: '' }];
      expect(() => validateExtractedClaims(malformedClaims)).toThrowError(/empty or invalid text/);
    });

    it('should normalize claimType and preserve nulls for missing metadata', () => {
      const raw = [
        {
          text: 'Power lines down in sector 5',
          claimType: 'INVALID_CATEGORY_XYZ',
          entities: [{ name: 'Sector 5', category: 'location' }]
        }
      ];

      const validated = validateExtractedClaims(raw);
      expect(validated[0].claimType).toBe('other'); // clamped to 'other'
      expect(validated[0].entities).toEqual([{ name: 'Sector 5', category: 'location' }]);
      expect(validated[0].location).toBeNull();
      expect(validated[0].attribution).toBeNull();
    });
  });

  describe('LLM Extractor & Graceful Fallback Handling', () => {
    it('should extract structured claims with entities when LLM mock succeeds', async () => {
      const mockLLMResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                claims: [
                  {
                    text: 'An earthquake damaged buildings in Pune',
                    claimType: 'damage',
                    entities: [
                      { name: 'Pune', category: 'location' },
                      { name: 'buildings', category: 'hazard' }
                    ],
                    location: { rawText: 'Pune', city: 'Pune' },
                    eventTime: null,
                    attribution: null,
                    uncertainty: { isUncertain: false, qualification: null },
                    sourceSpan: { text: 'An earthquake damaged buildings in Pune' }
                  },
                  {
                    text: 'Officials report that 40 families have been evacuated',
                    claimType: 'evacuation',
                    entities: [
                      { name: 'Officials', category: 'organization' },
                      { name: '40 families', category: 'quantity' }
                    ],
                    location: null,
                    eventTime: null,
                    attribution: 'Officials',
                    uncertainty: { isUncertain: false, qualification: null },
                    sourceSpan: { text: 'Officials report that 40 families have been evacuated' }
                  }
                ]
              })
            }
          }
        ]
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockLLMResponse
      });

      const result = await extractWithLLM('Sample input', {
        apiKey: 'mock-key',
        provider: 'mock-llm',
        fetch: mockFetch
      });

      expect(result.length).toBe(2);
      expect(result[0].text).toBe('An earthquake damaged buildings in Pune');
      expect(result[0].claimType).toBe('damage');
      expect(result[0].location.city).toBe('Pune');
      expect(result[1].attribution).toBe('Officials');
      expect(result[0].extractionMethod).toBe('llm');
    });

    it('should gracefully fall back to deterministic splitting if LLM call times out or fails', async () => {
      const mockFailingFetch = vi.fn().mockRejectedValue(new Error('Network connection timeout'));

      const postText = 'Flash flood triggered mudslides in Wayanad. Search and rescue teams deployed.';
      const result = await extractAtomicClaims(postText, {
        provider: 'mock-provider',
        apiKey: 'mock-key',
        fetch: mockFailingFetch
      });

      // Assert that it fell back to sentence splitter instead of crashing
      expect(result.method).toBe('deterministic_fallback');
      expect(result.claims.length).toBe(2);
      expect(result.claims[0].text).toBe('Flash flood triggered mudslides in Wayanad.');
      expect(result.claims[1].text).toBe('Search and rescue teams deployed.');
    });

    it('should fall back to sentence splitting if LLM returns malformed non-JSON', async () => {
      const mockMalformedFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Sorry, I cannot provide JSON right now.' } }]
        })
      });

      const postText = 'Heavy rainfall inundated metro tracks. Commuters advised to avoid central station.';
      const result = await extractAtomicClaims(postText, {
        provider: 'mock-provider',
        apiKey: 'mock-key',
        fetch: mockMalformedFetch
      });

      expect(result.method).toBe('deterministic_fallback');
      expect(result.claims.length).toBe(2);
    });
  });
});
