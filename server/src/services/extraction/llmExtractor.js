import { config } from '../../config/env.js';

const SYSTEM_PROMPT = `You are a disaster claim extraction engine for SignalTrace.
Your task is to decompose a raw disaster-related post or crisis message into discrete, atomic, independently verifiable factual assertions.

Guidelines:
1. An atomic claim must express one independently assessable assertion (e.g., event occurrence, infrastructure damage, casualty count, or evacuation directive).
2. Preserve original meaning, numbers, places, dates, uncertainty, and attribution verbatim.
3. NEVER invent, extrapolate, or hallucinate locations, casualties, dates, organizations, or attribution. If a detail is missing, set it to null.
4. Categorize claimType as one of: "event", "casualty", "damage", "evacuation", "location", "other".
5. Identify explicit entities (places, organizations, quantities, hazards).
6. Note uncertainty if the statement uses speculative or qualifying words (e.g., "allegedly", "rumored", "unconfirmed").
7. Identify attribution if someone is cited as having made the statement (e.g., "Officials report", "Witness claims").
8. Return ONLY valid JSON with this exact schema:
{
  "claims": [
    {
      "text": "Normalized atomic statement",
      "claimType": "event|casualty|damage|evacuation|location|other",
      "entities": [{ "name": "string", "category": "location|organization|quantity|person|date_time|hazard|other" }],
      "location": { "rawText": "string|null", "city": "string|null", "region": "string|null", "country": "string|null" } | null,
      "eventTime": "string|null",
      "attribution": "string|null",
      "uncertainty": { "isUncertain": boolean, "qualification": "string|null" },
      "sourceSpan": { "text": "substring excerpt from original post" }
    }
  ]
}`;

/**
 * Extracts atomic claims via configured LLM provider
 * @param {string} text - Cleaned post text
 * @param {object} [options] - Optional overrides (for testing/mocking)
 * @returns {Promise<Array<object>>} Extracted claims array
 */
export const extractWithLLM = async (text, options = {}) => {
  const apiKey = options.apiKey || config.llmApiKey;
  const provider = options.provider || config.llmProvider;
  const model = options.model || config.llmModel;
  const timeoutMs = options.timeoutMs || config.llmTimeoutMs || 8000;
  const customFetch = options.fetch || fetch;

  if (!apiKey) {
    throw new Error('LLM extraction requested but no LLM_API_KEY is configured');
  }

  const endpoint = options.baseUrl || config.llmBaseUrl || 'https://api.openai.com/v1/chat/completions';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await customFetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`LLM provider returned HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('LLM response missing expected message content');
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error('LLM returned malformed non-JSON payload');
    }

    const claims = Array.isArray(parsed) ? parsed : parsed.claims || parsed.atomicClaims;
    if (!Array.isArray(claims)) {
      throw new Error('LLM output does not contain an array of claims');
    }

    return claims.map((claim, idx) => ({
      ...claim,
      atomicClaimId: `ac-${idx + 1}`,
      extractionMethod: 'llm'
    }));
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`LLM extraction request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
};
