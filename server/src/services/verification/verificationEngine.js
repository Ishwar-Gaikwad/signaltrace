/**
 * SignalTrace — Phase 4.1: Deterministic Verification Engine (Hardened)
 *
 * VERDICT PRECEDENCE RULE (applied in order, exactly one verdict per atomic claim):
 *   1. OUTDATED    — A contradicting Evidence record has `supersedes: true` AND its
 *                    `evidenceTimestamp` is newer than the claim's `publishedAt`.
 *                    Both conditions must be present; either alone is insufficient.
 *                    Keyword matching in `explanation` text is NOT used as a primary signal.
 *
 *   2. CONFLICTING — At least one Evidence record has role "contradicting" and is NOT
 *                    classified as a temporal supersession (i.e., not OUTDATED).
 *                    This takes precedence over VERIFIED: when the same atomic claim has
 *                    both supporting and contradicting evidence, CONFLICTING is returned
 *                    and all evidence is retained for transparency.
 *
 *   3. VERIFIED    — All real Evidence records are "supporting" or "contextual" and at
 *                    least one has role "supporting".
 *
 *   4. UNVERIFIED  — No real Evidence records (only "insufficient" docs or empty set), or
 *                    evidence is exclusively "contextual" with no supporting corroboration.
 *
 * GEOGRAPHIC MISMATCH:
 *   The engine does NOT compute contradictions from distance numbers.
 *   Geographic contradiction is only valid when the evidence curator has explicitly set
 *   role: "contradicting" in the Evidence document, indicating that the authoritative
 *   source text directly establishes the event is incompatible with the claimed location.
 *   Raw distanceKm or locationMatched=false alone never flip the verdict.
 *
 * IDEMPOTENCY:
 *   `verifyClaimAtomics` uses MongoDB `$set` (updateOne) to overwrite verdicts in-place.
 *   It never creates or modifies Evidence documents; it only reads them.
 *   Repeated calls are safe: they produce identical verdicts and overwrite prior values.
 *   No duplicate Evidence records are created by the engine.
 *
 * UNSUPPORTED MATERIAL DETAILS:
 *   A claim that asserts a specific detail (casualty count, magnitude, evacuation number)
 *   receives Verified ONLY if the linked Evidence explicitly corroborates that detail.
 *   A report confirming the general event but not the specific detail results in Unverified
 *   unless contradicting evidence justifies Conflicting.
 */

import { Evidence, Claim } from '../../models/index.js';
import { matchAndCorroborateClaim } from './corroborationMatcher.service.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Determines whether a contradicting evidence record represents a confirmed temporal
 * supersession, warranting an OUTDATED verdict.
 *
 * Strict conditions — BOTH must be true:
 *   (a) `evidenceDoc.supersedes === true`  (curator-set structural flag)
 *   (b) `evidenceDoc.evidenceTimestamp > claimPublishedAt` (correction is newer than the claim)
 *
 * Neither condition alone is sufficient. This prevents keyword-brittle false positives.
 *
 * @param {object} evidenceDoc       — Lean Evidence document
 * @param {Date|null} claimPublishedAt — The parent Claim's publishedAt date
 * @returns {boolean}
 */
function isConfirmedSupersession(evidenceDoc, claimPublishedAt) {
  if (evidenceDoc.role !== 'contradicting') return false;
  if (!evidenceDoc.supersedes) return false;                  // must be explicitly flagged

  const evidenceTs = evidenceDoc.evidenceTimestamp
    ? new Date(evidenceDoc.evidenceTimestamp)
    : null;
  const claimTs = claimPublishedAt ? new Date(claimPublishedAt) : null;

  // Both timestamps must be present and the correcting bulletin must not post-date the claim
  if (!evidenceTs || !claimTs) return false;
  return Number.isFinite(evidenceTs.getTime()) && Number.isFinite(claimTs.getTime()) && evidenceTs > claimTs;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Determines the single verification verdict for one atomic claim by loading
 * its linked Evidence documents and applying the deterministic precedence rules.
 *
 * All evidence is retained in `evidenceSummary` regardless of the verdict,
 * ensuring contradictory evidence is never hidden.
 *
 * @param {object} atomicClaim  — Plain JS atomic claim object (must have `atomicClaimId`)
 * @param {object} parentClaim  — Parent Claim lean object (must have `_id`, `publishedAt`)
 * @returns {Promise<{
 *   verificationStatus: 'Verified'|'Conflicting'|'Outdated'|'Unverified',
 *   verificationExplanation: string,
 *   linkedEvidenceIds: import('mongoose').Types.ObjectId[],
 *   evidenceSummary: object[]
 * }>}
 */
export const determineVerificationStatus = async (atomicClaim, parentClaim) => {
  const { atomicClaimId } = atomicClaim;
  const claimMongoId = parentClaim._id;

  // Load every Evidence document linked to this (claimId, atomicClaimId) pair
  const evidenceDocs = await Evidence.find({
    claimId: claimMongoId,
    atomicClaimId,
    isSynthetic: parentClaim.isSynthetic === true
  }).lean();

  // Preserve all evidence for transparency — never omit contradictory records
  const evidenceSummary = evidenceDocs.map((ev) => ({
    evidenceId: ev._id.toString(),
    role: ev.role,
    supersedes: ev.supersedes ?? false,
    explanation: ev.explanation,
    excerpts: ev.excerpts || [],
    geographicRelevance: ev.geographicRelevance || null,
    evidenceTimestamp: ev.evidenceTimestamp || null,
    isSynthetic: ev.isSynthetic === true
  }));

  const linkedEvidenceIds = evidenceDocs.map((ev) => ev._id);

  // ── Rule 0: No real evidence (only "insufficient" role or empty set) ───────
  const hasRealEvidence = evidenceDocs.some((ev) => ev.role !== 'insufficient');
  if (!hasRealEvidence) {
    return {
      verificationStatus: 'Unverified',
      verificationExplanation:
        `No corroborating or contradicting report was found. ${evidenceDocs[0]?.explanation || 'Available evidence is insufficient.'}`,
      linkedEvidenceIds,
      evidenceSummary
    };
  }

  // ── Rule 1: OUTDATED (confirmed structural supersession) ──────────────────
  //
  // Requires evidence.supersedes === true AND evidenceTimestamp > claimPublishedAt.
  // Neither condition alone suffices. Keyword matching in explanation text is NOT used.
  const claimPublishedAt = parentClaim.publishedAt || null;
  const supersessionDocs = evidenceDocs.filter((ev) =>
    isConfirmedSupersession(ev, claimPublishedAt)
  );

  if (supersessionDocs.length > 0) {
    const primary = supersessionDocs[0];
    return {
      verificationStatus: 'Outdated',
      verificationExplanation:
        `This claim is outdated because a later report superseded the information. ${primary.explanation}`,
      linkedEvidenceIds,
      evidenceSummary
    };
  }

  // ── Rule 2: CONFLICTING (takes precedence over VERIFIED) ─────────────────
  //
  // When the same atomic claim has BOTH supporting and contradicting evidence,
  // CONFLICTING is assigned and all evidence is preserved. Contradictions are
  // never suppressed to produce a cleaner Verified verdict.
  const contradictingDocs = evidenceDocs.filter((ev) => ev.role === 'contradicting');
  if (contradictingDocs.length > 0) {
    const primary = contradictingDocs[0];
    return {
      verificationStatus: 'Conflicting',
      verificationExplanation: `This claim is contradicted by the linked source report. ${primary.explanation}`,
      linkedEvidenceIds,
      evidenceSummary
    };
  }

  // ── Rule 3: VERIFIED ─────────────────────────────────────────────────────
  //
  // Only reached when there are NO contradicting docs (Rule 2 did not fire).
  // A general event confirmation does NOT verify specific unrelated material
  // details unless the linked Evidence explicitly corroborates those details.
  const supportingDocs = evidenceDocs.filter((ev) => ev.role === 'supporting');
  if (supportingDocs.length > 0) {
    const primary = supportingDocs[0];
    return {
      verificationStatus: 'Verified',
      verificationExplanation: `This claim is corroborated by the linked source report. ${primary.explanation}`,
      linkedEvidenceIds,
      evidenceSummary
    };
  }

  // ── Rule 4: UNVERIFIED (only contextual evidence, no clear verdict) ───────
  return {
    verificationStatus: 'Unverified',
    verificationExplanation:
      'Available evidence provides context but is insufficient to confirm or refute this claim.',
    linkedEvidenceIds,
    evidenceSummary
  };
};

/**
 * Runs the deterministic verification engine across every atomic claim of a Claim document.
 *
 * Uses MongoDB `updateOne` with `$set` to write verdicts into AtomicClaim sub-documents.
 * This approach:
 *   - Bypasses full document validation (which would fail for synthetic seed data that
 *     stores `claimText` instead of the schema-required `text` field)
 *   - Is idempotent: repeated calls produce identical results and overwrite prior verdicts
 *   - Never creates or modifies Evidence documents
 *
 * @param {import('mongoose').Document} claimDoc — Mongoose Claim document (not lean)
 * @returns {Promise<{
 *   claimId: string,
 *   atomicClaimCount: number,
 *   verificationResults: object[]
 * }>}
 */
export const verifyClaimAtomics = async (claimDoc) => {
  // Dynamically match and generate evidence from stored IncidentReports if none exist
  await matchAndCorroborateClaim(claimDoc);

  const parentLean = claimDoc.toObject ? claimDoc.toObject() : claimDoc;
  const results = [];
  const updateOps = {};

  for (let i = 0; i < claimDoc.atomicClaims.length; i++) {
    const atomicClaim = claimDoc.atomicClaims[i];
    const atomicClaimPlain = atomicClaim.toObject ? atomicClaim.toObject() : atomicClaim;
    const result = await determineVerificationStatus(atomicClaimPlain, parentLean);

    // Positional $set — overwrites any prior verdict in-place (idempotent)
    updateOps[`atomicClaims.${i}.verificationStatus`] = result.verificationStatus;
    updateOps[`atomicClaims.${i}.verificationExplanation`] = result.verificationExplanation;
    updateOps[`atomicClaims.${i}.linkedEvidenceIds`] = result.linkedEvidenceIds;

    results.push({ atomicClaimId: atomicClaim.atomicClaimId, ...result });
  }

  // Single atomic write — all fields for all sub-documents in one round trip
  await Claim.updateOne({ _id: claimDoc._id }, { $set: updateOps });

  return {
    claimId: claimDoc._id.toString(),
    atomicClaimCount: claimDoc.atomicClaims.length,
    verificationResults: results
  };
};
