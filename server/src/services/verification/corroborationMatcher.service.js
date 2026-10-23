/**
 * Match an atomic claim only to a same-provenance, same-hazard report that names
 * the claimed location. A broad same-hazard match is context at best, never proof.
 */

import { IncidentReport, Evidence } from '../../models/index.js';

const HAZARD_PATTERNS = [
  { type: 'earthquake', regex: /\b(earthquake|quake|tremor|seismic|richter|epicenter|mww|fault line)\b/i },
  { type: 'flood', regex: /\b(flood|flooding|inundat|water level|submerged|overflow|embankment|river)\b/i },
  { type: 'cyclone', regex: /\b(cyclone|hurricane|typhoon|storm surge|landfall|depression|cyclonic)\b/i },
  { type: 'wildfire', regex: /\b(wildfire|forest fire|bushfire|blaze|firestorm)\b/i },
  { type: 'landslide', regex: /\b(landslide|mudslide|debris flow|rockfall)\b/i },
  { type: 'storm', regex: /\b(thunderstorm|cloudburst|hailstorm|gale|severe weather)\b/i }
];

const LOCATION_FIELDS = ['city', 'rawText'];
const MATERIAL_PATTERNS = {
  casualty: /\b(death|deaths|dead|fatalit(?:y|ies)|killed|injured|casualt(?:y|ies))\b/i,
  evacuation: /\b(evacuat\w*|relocat\w*|shelter\w*)\b/i,
  damage: /\b(damag\w*|destroy\w*|collaps\w*|flatten\w*|washed away|crack\w*|inundat\w*)\b/i
};
const CLAIM_DETAIL_PATTERNS = [
  { pattern: /\b(?:danger (?:mark|level|threshold)|crossed (?:the )?danger|exceed(?:ed)? (?:the )?danger|overtopp\w*|embankment breach)\b/i, label: 'danger-level or breach detail' },
  { pattern: /\b(?:collaps\w*|flatten\w*|washed away)\b/i, label: 'collapse or destruction detail' },
  { pattern: /\b(?:red|orange|yellow)\s+(?:alert|warning|advisory)\b/i, label: 'alert level' },
  { pattern: /\b(?:landfall|storm surge|recurv\w*)\b/i, label: 'storm movement detail' },
  { pattern: /\b\d+(?:\.\d+)?\s*(?:km\/?h|kmph|mph|knots?)\b/i, label: 'wind-speed figure' }
];
const CORRECTION_PATTERN = /\b(cancel(?:led|ed|lation)?|withdraw(?:n|al)?|stand[ -]?down|all[ -]?clear|downgrad(?:e|ed|ing)|recurv(?:e|ed)|supersed(?:e|ed)|revok(?:e|ed)|rescinded|retracted|correct(?:ed|ion))\b/i;
const DIRECTIVE_PATTERN = /\b(evacuat\w*|alert|warning|order|advisory|all[ -]?clear|landfall|currently active|active now|right now)\b/i;
const NUMBER_PATTERN = /\b\d+(?:,\d{3})*(?:\.\d+)?\b/;
const ALL_NUMBERS_PATTERN = /\b\d+(?:,\d{3})*(?:\.\d+)?\b/g;
const NUMBER_WORD_PATTERN = /\b(one|two|three|four|five|six|seven|eight|nine|ten|dozen|hundred|hundreds|thousand|thousands)\b/i;

const normalize = (value) => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function extractLocationTerms(atomicClaim, parentClaim) {
  const terms = [];
  const locations = [atomicClaim.location, atomicClaim.claimedLocation, parentClaim.claimedLocation];
  for (const location of locations) {
    for (const field of LOCATION_FIELDS) {
      if (typeof location?.[field] === 'string' && location[field].trim()) {
        terms.push(location[field].trim());
      }
    }
    for (const entity of location?.entities || []) {
      if (typeof entity === 'string') terms.push(entity.trim());
    }
  }

  for (const entity of atomicClaim.entities || []) {
    if (entity?.category === 'location' && typeof entity.name === 'string') terms.push(entity.name.trim());
  }

  return [...new Set(terms.map((term) => term.trim()).filter((term) => term.length >= 3))];
}

function incidentMatchesLocation(incident, terms) {
  const geography = incident.geographicInfo || {};
  const sourceText = normalize([
    geography.locationName,
    geography.adminRegion,
    incident.title,
    incident.description
  ].filter(Boolean).join(' '));
  return terms.some((term) => {
    const escaped = escapeRegex(normalize(term));
    return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}([^\\p{L}\\p{N}]|$)`, 'u').test(sourceText);
  });
}

function incidentText(incident) {
  return [incident.title, incident.description].filter((value) => typeof value === 'string').join(' ');
}

function extractClaimMagnitude(text) {
  const match = String(text || '').match(/\b(?:magnitude\s*|m\s*|richter\s*)([0-9](?:\.[0-9]+)?)\b/i);
  return match ? Number(match[1]) : null;
}

function extractSourceMagnitude(incident) {
  const structured = incident.rawPayload?.magnitude ?? incident.rawPayload?.mag;
  if (Number.isFinite(Number(structured))) return Number(structured);
  const match = incidentText(incident).match(/\b(?:magnitude\s*|m\s*)([0-9](?:\.[0-9]+)?)\b/i);
  return match ? Number(match[1]) : null;
}

function numbersIn(text) {
  return (String(text || '').match(ALL_NUMBERS_PATTERN) || []).map((number) => Number(number.replaceAll(',', '')));
}

function getMaterialCategory(text) {
  for (const [category, pattern] of Object.entries(MATERIAL_PATTERNS)) {
    if (pattern.test(text)) return category;
  }
  return null;
}

function hasSpecificQuantity(text) {
  return NUMBER_PATTERN.test(text) || NUMBER_WORD_PATTERN.test(text);
}

function isNegativeAssertion(text, category) {
  const pattern = MATERIAL_PATTERNS[category];
  if (!pattern) return false;
  const match = String(text || '').match(pattern);
  if (!match || match.index === undefined) return false;
  return /\b(no|zero|none|without|not|never)\b/i.test(text.slice(Math.max(0, match.index - 24), match.index));
}

function categoryHasExplicitSourceDetail(sourceText, category) {
  if (category === 'casualty') return /\b(death|deaths|dead|fatalit(?:y|ies)|killed|injured|casualt(?:y|ies))\b/i.test(sourceText);
  if (category === 'evacuation') return /\b(evacuat\w*|relocat\w*|shelter\w*)\b/i.test(sourceText);
  if (category === 'damage') return /\b(damag\w*|destroy\w*|collaps\w*|flatten\w*|washed away|crack\w*|inundat\w*)\b/i.test(sourceText);
  return false;
}

function assessIncident(claimText, incident, claimPublishedAt, locationTerms) {
  const sourceText = incidentText(incident);
  const claimMagnitude = extractClaimMagnitude(claimText);
  const sourceMagnitude = extractSourceMagnitude(incident);
  const materialCategory = getMaterialCategory(claimText);
  const claimHasQuantity = hasSpecificQuantity(claimText);
  const sourceHasCategory = materialCategory && categoryHasExplicitSourceDetail(sourceText, materialCategory);
  const correction = CORRECTION_PATTERN.test(sourceText) && DIRECTIVE_PATTERN.test(claimText) && DIRECTIVE_PATTERN.test(sourceText);

  if (claimMagnitude !== null) {
    if (sourceMagnitude === null) {
      return { role: 'contextual', supersedes: false, explanation: `The report matches the claimed hazard and location but does not state a magnitude.` };
    }
    const difference = Math.abs(claimMagnitude - sourceMagnitude);
    if (difference >= 0.5) {
      return {
        role: 'contradicting',
        supersedes: false,
        explanation: `The source reports magnitude ${sourceMagnitude}; the claim states ${claimMagnitude}.`
      };
    }
    if (difference > 0.05) {
      return {
        role: 'contextual',
        supersedes: false,
        explanation: `The source reports magnitude ${sourceMagnitude}, which does not exactly confirm the claimed ${claimMagnitude}.`
      };
    }
  }

  if (materialCategory) {
    if (!sourceHasCategory) {
      return {
        role: 'contextual',
        supersedes: false,
        explanation: `The report matches the hazard and location but does not provide the claimed ${materialCategory} detail.`
      };
    }

    const claimNegative = isNegativeAssertion(claimText, materialCategory);
    const sourceNegative = isNegativeAssertion(sourceText, materialCategory);
    const claimNumbers = numbersIn(claimText);
    const sourceNumbers = numbersIn(sourceText);
    if (claimHasQuantity) {
      if (claimNumbers.length === 0 || sourceNumbers.length === 0) {
        return {
          role: 'contextual',
          supersedes: false,
          explanation: `The report mentions ${materialCategory} information but does not state a comparable quantity.`
        };
      }
      const sameQuantity = claimNumbers.some((number) => sourceNumbers.includes(number));
      if (!sameQuantity) {
        return {
          role: 'contradicting',
          supersedes: false,
          explanation: `The source gives a different explicit ${materialCategory} quantity from the one in the claim.`
        };
      }
    }
    if (claimNegative !== sourceNegative) {
      return {
        role: 'contradicting',
        supersedes: false,
        explanation: `The source explicitly describes ${materialCategory} information that conflicts with the claim’s assertion.`
      };
    }
  } else if (claimHasQuantity && claimMagnitude === null) {
    const claimNumbers = numbersIn(claimText);
    const sourceNumbers = numbersIn(sourceText);
    if (!claimNumbers.length || !sourceNumbers.length || !claimNumbers.some((number) => sourceNumbers.includes(number))) {
      return {
        role: 'contextual',
        supersedes: false,
        explanation: 'The report matches the hazard and location but does not state the specific quantity in the claim.'
      };
    }
  }

  const unsupportedDetail = CLAIM_DETAIL_PATTERNS.find(({ pattern }) => pattern.test(claimText) && !pattern.test(sourceText));
  if (unsupportedDetail) {
    return {
      role: 'contextual',
      supersedes: false,
      explanation: `The report matches the hazard and location but does not state the claimed ${unsupportedDetail.label}.`
    };
  }

  if (correction) {
    const evidenceTime = incident.publishedAt ? new Date(incident.publishedAt) : null;
    const claimTime = claimPublishedAt ? new Date(claimPublishedAt) : null;
    const validEvidenceTime = evidenceTime && Number.isFinite(evidenceTime.getTime());
    const validClaimTime = claimTime && Number.isFinite(claimTime.getTime());
    if (!validEvidenceTime || !validClaimTime) {
      return {
        role: 'contradicting',
        supersedes: false,
        explanation: 'The source explicitly reports a cancellation or correction, but a missing timestamp prevents classifying this claim as outdated.'
      };
    }
    if (evidenceTime > claimTime) {
      return {
        role: 'contradicting',
        supersedes: true,
        explanation: `A later report for ${locationTerms.join(', ')} explicitly says: ${sourceText.slice(0, 180)}`
      };
    }
    return {
      role: 'contradicting',
      supersedes: false,
      explanation: `The source explicitly reports a cancellation or correction, but it is not newer than the claim: ${sourceText.slice(0, 180)}`
    };
  }

  return {
    role: 'supporting',
    supersedes: false,
    explanation: `The source report names the claimed hazard and location${claimMagnitude !== null && sourceMagnitude !== null ? ` and reports magnitude ${sourceMagnitude}` : ''}.`
  };
}

function createInsufficientEvidence(claimDoc, atomicClaimId, explanation) {
  return Evidence.create({
    claimId: claimDoc._id,
    atomicClaimId,
    incidentReportIds: [],
    excerpts: [],
    role: 'insufficient',
    evidenceTimestamp: null,
    geographicRelevance: null,
    explanation,
    supersedes: false,
    isSynthetic: claimDoc.isSynthetic === true
  });
}

/**
 * Creates evidence only from same-provenance records that match the atomic
 * statement's hazard and an explicitly named place. Insufficient details remain
 * contextual so the verdict engine returns Unverified.
 */
export async function matchAndCorroborateClaim(claimDoc) {
  const claimId = claimDoc._id;
  const atomicClaims = claimDoc.atomicClaims || [];
  if (atomicClaims.length === 0) return 0;

  const totalGenerated = await Evidence.countDocuments({ claimId });
  let generated = 0;
  const syntheticClaim = claimDoc.isSynthetic === true;

  for (const atomicClaim of atomicClaims) {
    const atomicClaimId = atomicClaim.atomicClaimId;
    if (await Evidence.exists({ claimId, atomicClaimId })) continue;

    const claimText = atomicClaim.text || atomicClaim.claimText || '';
    const matchedHazard = HAZARD_PATTERNS.find(({ regex }) => regex.test(claimText));
    const locationTerms = extractLocationTerms(atomicClaim, claimDoc);
    if (!matchedHazard) {
      await createInsufficientEvidence(claimDoc, atomicClaimId, 'No supported hazard type was identified in this statement.');
      generated++;
      continue;
    }
    if (locationTerms.length === 0) {
      await createInsufficientEvidence(claimDoc, atomicClaimId, 'The statement does not identify a location that can be matched to a stored report.');
      generated++;
      continue;
    }

    // Provenance is an eligibility condition, not a label applied after matching.
    const candidates = await IncidentReport.find({
      eventType: matchedHazard.type,
      isSynthetic: syntheticClaim
    }).sort({ publishedAt: -1, _id: -1 }).limit(100).lean();
    const matchingIncidents = candidates.filter((incident) => incidentMatchesLocation(incident, locationTerms)).slice(0, 3);

    if (matchingIncidents.length === 0) {
      await createInsufficientEvidence(
        claimDoc,
        atomicClaimId,
        `No ${syntheticClaim ? 'demo' : 'live'} report matching the ${matchedHazard.type} hazard and stated location was found.`
      );
      generated++;
      continue;
    }

    for (const incident of matchingIncidents) {
      const assessment = assessIncident(claimText, incident, claimDoc.publishedAt, locationTerms);
      const sourceText = incident.description || incident.title || '';
      const sourceUrl = typeof incident.sourceUrl === 'string' && /^https?:\/\//i.test(incident.sourceUrl)
        ? incident.sourceUrl
        : null;
      await Evidence.create({
        claimId,
        atomicClaimId,
        incidentReportIds: [incident._id],
        excerpts: sourceText
          ? [{
              excerptText: sourceText.slice(0, 500),
              sourceRef: incident.sourceReportId || null,
              sourceName: incident.sourceName || null,
              url: sourceUrl
            }]
          : [],
        role: assessment.role,
        evidenceTimestamp: incident.publishedAt || null,
        geographicRelevance: {
          locationMatched: true,
          distanceKm: null,
          notes: incident.geographicInfo?.locationName || locationTerms.join(', ')
        },
        explanation: assessment.explanation,
        supersedes: assessment.supersedes,
        isSynthetic: incident.isSynthetic === true
      });
      generated++;
    }
  }

  return totalGenerated + generated;
}
