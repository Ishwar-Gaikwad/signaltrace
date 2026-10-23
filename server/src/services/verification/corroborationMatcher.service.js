/**
 * SignalTrace — Automated Incident Corroboration & Evidence Matcher
 *
 * Dynamically queries authoritative IncidentReport records in MongoDB to find
 * matching or contradicting official alerts for incoming atomic claims.
 * Generates Evidence records grounded in real stored reports with source citations,
 * timestamps, and contradiction/supporting roles before the verification engine runs.
 */

import { IncidentReport, Evidence } from '../../models/index.js';

// Regex dictionary for detecting hazard event types
const HAZARD_PATTERNS = [
  { type: 'earthquake', regex: /\b(earthquake|quake|tremor|seismic|richter|epicenter|mww|fault line)\b/i },
  { type: 'flood', regex: /\b(flood|flooding|inundat|water level|submerged|overflow|embankment|river)\b/i },
  { type: 'cyclone', regex: /\b(cyclone|hurricane|typhoon|storm surge|landfall|depression|cyclonic)\b/i },
  { type: 'wildfire', regex: /\b(wildfire|forest fire|bushfire|blaze|firestorm)\b/i },
  { type: 'landslide', regex: /\b(landslide|mudslide|debris flow|rockfall)\b/i },
  { type: 'storm', regex: /\b(thunderstorm|cloudburst|hailstorm|gale|severe weather)\b/i }
];

// Common location extractor helper
function extractLocationKeywords(text, claimedLocation) {
  const keywords = [];
  if (claimedLocation?.city) keywords.push(claimedLocation.city);
  if (claimedLocation?.region) keywords.push(claimedLocation.region);
  if (claimedLocation?.rawText) keywords.push(claimedLocation.rawText);

  // Extract capitalized words that could represent places/proper nouns (min 3 chars)
  const matches = text.match(/\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})*\b/g);
  if (matches) {
    for (const m of matches) {
      if (!['The', 'Massive', 'Severe', 'Alert', 'Government', 'Officials', 'Report', 'Water', 'Over', 'Red'].includes(m)) {
        keywords.push(m);
      }
    }
  }

  return [...new Set(keywords)];
}

// Extract magnitude from claim text if present (e.g. 7.2 or M7.2)
function extractClaimMagnitude(text) {
  const match = text.match(/(?:magnitude|m|richter)?\s*([4-9]\.[0-9]|[4-9])(?:\s*(?:richter|magnitude))?/i);
  return match ? parseFloat(match[1]) : null;
}

/**
 * Searches stored IncidentReports to corroborate or contradict a given atomic claim.
 * Generates and saves Evidence documents for the claim if none exist.
 *
 * @param {object} claimDoc - Full Mongoose Claim document
 * @returns {Promise<number>} Number of Evidence records generated
 */
export async function matchAndCorroborateClaim(claimDoc) {
  const claimId = claimDoc._id;

  // Idempotency check: if Evidence records already exist for this claim, do not duplicate
  const existingCount = await Evidence.countDocuments({ claimId });
  if (existingCount > 0) {
    return existingCount;
  }

  const atomicClaims = claimDoc.atomicClaims || [];
  if (atomicClaims.length === 0) {
    return 0;
  }

  let totalGenerated = 0;

  for (const atomicClaim of atomicClaims) {
    const claimText = atomicClaim.text || atomicClaim.claimText || '';
    const atomicClaimId = atomicClaim.atomicClaimId;

    // 1. Identify hazard type
    let matchedEventType = null;
    for (const hp of HAZARD_PATTERNS) {
      if (hp.regex.test(claimText) || hp.regex.test(claimDoc.originalText)) {
        matchedEventType = hp.type;
        break;
      }
    }

    // 2. Extract location keywords
    const locationKeywords = extractLocationKeywords(claimText, claimDoc.claimedLocation);

    // 3. Build MongoDB query against IncidentReport
    const queryConditions = [];

    if (matchedEventType) {
      queryConditions.push({ eventType: matchedEventType });
    }

    if (locationKeywords.length > 0) {
      const locRegexes = locationKeywords.map((k) => new RegExp(k, 'i'));
      queryConditions.push({
        $or: [
          { 'geographicInfo.locationName': { $in: locRegexes } },
          { 'geographicInfo.adminRegion': { $in: locRegexes } },
          { 'geographicInfo.country': { $in: locRegexes } },
          { title: { $in: locRegexes } },
          { description: { $in: locRegexes } }
        ]
      });
    }

    // Query incident reports
    let matchingIncidents = [];
    if (queryConditions.length > 0) {
      matchingIncidents = await IncidentReport.find({ $and: queryConditions })
        .sort({ publishedAt: -1 })
        .limit(3)
        .lean();
    }

    // Fallback: if no location match, search by eventType alone
    if (matchingIncidents.length === 0 && matchedEventType) {
      matchingIncidents = await IncidentReport.find({ eventType: matchedEventType })
        .sort({ publishedAt: -1 })
        .limit(2)
        .lean();
    }

    // If still no incidents found, create an 'insufficient' evidence record communicating uncertainty
    if (matchingIncidents.length === 0) {
      await Evidence.create({
        claimId,
        atomicClaimId,
        incidentReportIds: [],
        excerpts: [],
        role: 'insufficient',
        evidenceTimestamp: new Date(),
        geographicRelevance: null,
        explanation: 'No authoritative emergency reports found in repository matching the claimed hazard and location.',
        supersedes: false,
        isSynthetic: false
      });
      totalGenerated++;
      continue;
    }

    // Extract claim metrics for cross-examination
    const claimedMag = extractClaimMagnitude(claimText);

    // 4. Corroborate each matching incident
    for (const incident of matchingIncidents) {
      let role = 'supporting';
      let supersedes = false;
      let explanation = '';
      const incidentMag = incident.rawPayload?.magnitude || incident.rawPayload?.mag || null;
      const incidentDesc = (incident.description || '').toLowerCase();
      const incidentTitle = (incident.title || '').toLowerCase();

      // Check temporal supersession / cancellation
      const isCancellation =
        incidentTitle.includes('downgrade') ||
        incidentTitle.includes('cancellation') ||
        incidentTitle.includes('stand-down') ||
        incidentTitle.includes('recurved') ||
        incidentTitle.includes('all clear') ||
        incidentDesc.includes('cancelled') ||
        incidentDesc.includes('downgraded');

      const claimPublishedAt = claimDoc.publishedAt ? new Date(claimDoc.publishedAt) : null;
      const incidentPublishedAt = incident.publishedAt ? new Date(incident.publishedAt) : new Date();

      if (isCancellation && claimPublishedAt && incidentPublishedAt >= claimPublishedAt) {
        role = 'contradicting';
        supersedes = true;
        explanation = `Superceded by newer authoritative bulletin '${incident.title}' (${incident.sourceName}) which withdrew or downgraded the directive.`;
      }
      // Check magnitude discrepancy (e.g. claimed 7.2 vs official 5.4)
      else if (claimedMag !== null && incidentMag !== null && Math.abs(claimedMag - incidentMag) >= 0.5) {
        role = 'contradicting';
        explanation = `Contradicts official measurement from ${incident.sourceName}: reports magnitude ${incidentMag}, not claimed ${claimedMag}.`;
      }
      // Check severe casualty exaggeration (e.g. claim asserts hundreds dead vs report stating no casualties)
      else if (
        (claimText.toLowerCase().includes('hundreds dead') || claimText.toLowerCase().includes('flattened')) &&
        (incidentDesc.includes('no major building collapses') || incidentDesc.includes('low casualty probability') || incidentDesc.includes('minor structural'))
      ) {
        role = 'contradicting';
        explanation = `Official situation assessment from ${incident.sourceName} indicates minor damage with low casualty probability, contradicting claims of catastrophic destruction.`;
      }
      // Check hospital / infrastructure operational status contradiction
      else if (
        claimText.toLowerCase().includes('power grid is dead') ||
        claimText.toLowerCase().includes('total darkness')
      ) {
        if (incidentDesc.includes('backup generators operating') || incidentDesc.includes('power operational') || incidentDesc.includes('grid stable')) {
          role = 'contradicting';
          explanation = `Official DEOC utility bulletin confirms backup power is operational, contradicting the total blackout claim.`;
        }
      }
      // Supporting corroboration
      else {
        role = 'supporting';
        explanation = `Corroborated by official emergency bulletin from ${incident.sourceName}: "${incident.title}".`;
      }

      // Excerpt creation
      const excerptText = incident.description
        ? incident.description.slice(0, 240)
        : incident.title;

      await Evidence.create({
        claimId,
        atomicClaimId,
        incidentReportIds: [incident._id],
        excerpts: [
          {
            excerptText,
            sourceRef: incident.sourceReportId || null,
            sourceName: incident.sourceName || 'Emergency Authority',
            url: incident.sourceUrl || null
          }
        ],
        role,
        evidenceTimestamp: incident.publishedAt || new Date(),
        geographicRelevance: incident.geographicInfo?.coordinates
          ? {
              locationMatched: locationKeywords.length > 0,
              distanceKm: null,
              notes: incident.geographicInfo.locationName || null
            }
          : null,
        explanation,
        supersedes,
        isSynthetic: false
      });

      totalGenerated++;
    }
  }

  return totalGenerated;
}
