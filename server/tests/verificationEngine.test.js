/**
 * Phase 4 — Deterministic Verification Engine Tests
 *
 * Tests cover all six synthetic scenarios from the seed dataset:
 *   Scenario A: Verified   (Teesta Flood claim with supporting evidence)
 *   Scenario B: Conflicting (M7.2 earthquake claim contradicted by M5.4/5.5 reports)
 *   Scenario C: Outdated   (Paradip evacuation superseded by downgrade bulletin)
 *   Scenario D: Conflicting (Shimla wildfire geographic mismatch)
 *   Scenario E: Unverified  (Bhadra dam rumour — zero evidence)
 *   Scenario F1: Verified   (Suketi bridge damage — supported)
 *   Scenario F2: Conflicting (Hospital blackout — contradicted)
 *
 * Additionally tests the POST /api/claims/:id/verify HTTP endpoint.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app.js';
import { Claim, Evidence, IncidentReport } from '../src/models/index.js';
import { seedSyntheticData } from '../src/services/seed.service.js';
import { determineVerificationStatus, verifyClaimAtomics } from '../src/services/verification/verificationEngine.js';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/verialert_test';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }
  await seedSyntheticData();
});

afterAll(async () => {
  await mongoose.disconnect();
});

// Helper: fetch a synthetic claim by syntheticId (as full Mongoose document)
async function getClaimDoc(syntheticId) {
  return Claim.findOne({ syntheticId });
}

// Helper: fetch a synthetic claim as lean object
async function getClaimLean(syntheticId) {
  return Claim.findOne({ syntheticId }).lean();
}

// ===========================================================================
// Unit tests: determineVerificationStatus
// ===========================================================================
describe('Phase 4 — determineVerificationStatus unit tests', () => {

  it('Scenario A — should return Verified for Teesta Flood claim (supporting evidence)', async () => {
    const claimLean = await getClaimLean('synth-claim-001');
    expect(claimLean).not.toBeNull();

    const atomicClaim = claimLean.atomicClaims[0];
    expect(atomicClaim.atomicClaimId).toBe('atom-001-1');

    const result = await determineVerificationStatus(atomicClaim, claimLean);
    expect(result.verificationStatus).toBe('Verified');
    expect(result.linkedEvidenceIds).toHaveLength(1);
    expect(result.evidenceSummary[0].role).toBe('supporting');
    expect(result.verificationExplanation).toMatch(/corroborated/i);
  });

  it('Scenario B — should return Conflicting for inflated M7.2 earthquake claim (USGS+NCS contradict)', async () => {
    const claimLean = await getClaimLean('synth-claim-002');
    expect(claimLean).not.toBeNull();

    // atom-002-1: magnitude claim contradicted by USGS+NCS
    const atomicClaim = claimLean.atomicClaims.find((a) => a.atomicClaimId === 'atom-002-1');
    expect(atomicClaim).toBeDefined();

    const result = await determineVerificationStatus(atomicClaim, claimLean);
    expect(result.verificationStatus).toBe('Conflicting');
    expect(result.evidenceSummary.some((e) => e.role === 'contradicting')).toBe(true);
    expect(result.verificationExplanation).toMatch(/contradicted/i);
  });

  it('Scenario C — should return Outdated for Paradip evacuation claim (superseded by bulletin)', async () => {
    const claimLean = await getClaimLean('synth-claim-003');
    expect(claimLean).not.toBeNull();

    const atomicClaim = claimLean.atomicClaims[0];
    expect(atomicClaim.atomicClaimId).toBe('atom-003-1');

    const result = await determineVerificationStatus(atomicClaim, claimLean);
    expect(result.verificationStatus).toBe('Outdated');
    expect(result.verificationExplanation).toMatch(/superseded/i);
  });

  it('Scenario D — should return Conflicting for Shimla wildfire geographic mismatch claim', async () => {
    const claimLean = await getClaimLean('synth-claim-004');
    expect(claimLean).not.toBeNull();

    const atomicClaim = claimLean.atomicClaims[0];
    const result = await determineVerificationStatus(atomicClaim, claimLean);
    expect(result.verificationStatus).toBe('Conflicting');
    expect(result.evidenceSummary[0].geographicRelevance.locationMatched).toBe(false);
  });

  it('Scenario E — should return Unverified for Bhadra Dam rumor (insufficient evidence)', async () => {
    const claimLean = await getClaimLean('synth-claim-005');
    expect(claimLean).not.toBeNull();

    const atomicClaim = claimLean.atomicClaims[0];
    const result = await determineVerificationStatus(atomicClaim, claimLean);
    expect(result.verificationStatus).toBe('Unverified');
    expect(result.linkedEvidenceIds).toHaveLength(1); // only the insufficient doc
  });

  it('Scenario F1 — should return Verified for Suketi bridge collapse (supported by DEOC alert)', async () => {
    const claimLean = await getClaimLean('synth-claim-006');
    expect(claimLean).not.toBeNull();

    const atomicClaim = claimLean.atomicClaims.find((a) => a.atomicClaimId === 'atom-006-1');
    expect(atomicClaim).toBeDefined();

    const result = await determineVerificationStatus(atomicClaim, claimLean);
    expect(result.verificationStatus).toBe('Verified');
    expect(result.evidenceSummary[0].role).toBe('supporting');
  });

  it('Scenario F2 — should return Conflicting for hospital blackout claim (DEOC confirms power operational)', async () => {
    const claimLean = await getClaimLean('synth-claim-006');
    expect(claimLean).not.toBeNull();

    const atomicClaim = claimLean.atomicClaims.find((a) => a.atomicClaimId === 'atom-006-2');
    expect(atomicClaim).toBeDefined();

    const result = await determineVerificationStatus(atomicClaim, claimLean);
    expect(result.verificationStatus).toBe('Conflicting');
    expect(result.evidenceSummary[0].role).toBe('contradicting');
  });
});

// ===========================================================================
// Integration tests: verifyClaimAtomics + claim document mutation
// ===========================================================================
describe('Phase 4 — verifyClaimAtomics integration tests', () => {

  it('should write verificationStatus, explanation, and linkedEvidenceIds into all AtomicClaim sub-documents', async () => {
    const claimDoc = await getClaimDoc('synth-claim-001');
    expect(claimDoc).not.toBeNull();

    const result = await verifyClaimAtomics(claimDoc);

    expect(result.claimId).toBe(claimDoc._id.toString());
    expect(result.atomicClaimCount).toBeGreaterThan(0);
    expect(result.verificationResults).toHaveLength(result.atomicClaimCount);

    // Reload from DB to confirm persistence
    const reloaded = await Claim.findById(claimDoc._id).lean();
    for (const atom of reloaded.atomicClaims) {
      expect(['Verified', 'Conflicting', 'Outdated', 'Unverified']).toContain(atom.verificationStatus);
      expect(atom.verificationExplanation).not.toBeNull();
    }
  });

  it('should produce Verified + Conflicting within the same multi-claim (Scenario F)', async () => {
    const claimDoc = await getClaimDoc('synth-claim-006');
    const result = await verifyClaimAtomics(claimDoc);

    const statuses = result.verificationResults.map((r) => r.verificationStatus);
    expect(statuses).toContain('Verified');
    expect(statuses).toContain('Conflicting');
  });
});

// ===========================================================================
// HTTP API tests: POST /api/claims/:id/verify
// ===========================================================================
describe('Phase 4 — POST /api/claims/:id/verify API endpoint', () => {

  it('should return 200 with verificationResults in the meta field', async () => {
    const claimLean = await getClaimLean('synth-claim-002');
    const claimId = claimLean._id.toString();

    const res = await request(app).post(`/api/claims/${claimId}/verify`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.meta.verificationResults).toBeDefined();
    expect(Array.isArray(res.body.meta.verificationResults)).toBe(true);
    expect(res.body.meta.verificationResults.length).toBeGreaterThan(0);
  });

  it('should assign Conflicting status to the M7.2 earthquake atomic claim via HTTP', async () => {
    const claimLean = await getClaimLean('synth-claim-002');
    const claimId = claimLean._id.toString();

    const res = await request(app).post(`/api/claims/${claimId}/verify`);
    expect(res.status).toBe(200);

    const magnitudeClaim = res.body.meta.verificationResults.find(
      (r) => r.atomicClaimId === 'atom-002-1'
    );
    expect(magnitudeClaim).toBeDefined();
    expect(magnitudeClaim.verificationStatus).toBe('Conflicting');
  });

  it('should assign Outdated status to the Paradip evacuation claim via HTTP', async () => {
    const claimLean = await getClaimLean('synth-claim-003');
    const claimId = claimLean._id.toString();

    const res = await request(app).post(`/api/claims/${claimId}/verify`);
    expect(res.status).toBe(200);
    expect(res.body.meta.verificationResults[0].verificationStatus).toBe('Outdated');
  });

  it('should assign Unverified status to the Bhadra Dam claim via HTTP', async () => {
    const claimLean = await getClaimLean('synth-claim-005');
    const claimId = claimLean._id.toString();

    const res = await request(app).post(`/api/claims/${claimId}/verify`);
    expect(res.status).toBe(200);
    expect(res.body.meta.verificationResults[0].verificationStatus).toBe('Unverified');
  });

  it('should return 400 for an invalid ObjectId', async () => {
    const res = await request(app).post('/api/claims/not-a-valid-id/verify');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_IDENTIFIER');
  });

  it('should return 404 for a valid but non-existent ObjectId', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).post(`/api/claims/${fakeId}/verify`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('should persist verificationStatus into the claim record after verify call', async () => {
    const claimLean = await getClaimLean('synth-claim-001');
    const claimId = claimLean._id.toString();

    await request(app).post(`/api/claims/${claimId}/verify`);

    const updated = await Claim.findById(claimId).lean();
    const validStatuses = ['Verified', 'Conflicting', 'Outdated', 'Unverified'];
    for (const atom of updated.atomicClaims) {
      expect(validStatuses).toContain(atom.verificationStatus);
    }
  });
});

// ===========================================================================
// Phase 4.1 — Hardened Verification Rules & Regression Suite
// ===========================================================================
describe('Phase 4.1 — Verification Rule Hardening & Regression Suite', () => {

  // 1. One verdict per atomic claim
  it('1. Enforce exactly one verdict per atomic claim across all synthetic claims', async () => {
    const claims = await Claim.find({ isSynthetic: true });
    expect(claims.length).toBeGreaterThan(0);

    const validStatuses = ['Verified', 'Conflicting', 'Outdated', 'Unverified'];
    for (const claim of claims) {
      const result = await verifyClaimAtomics(claim);
      for (const atomResult of result.verificationResults) {
        expect(validStatuses).toContain(atomResult.verificationStatus);
        expect(atomResult.verificationExplanation).toBeDefined();
        expect(atomResult.verificationExplanation.length).toBeGreaterThan(5);
        expect(Array.isArray(atomResult.linkedEvidenceIds)).toBe(true);
        expect(Array.isArray(atomResult.evidenceSummary)).toBe(true);
      }
    }
  });

  // 2. Mixed verdicts across different claims in one post (Scenarios F & G)
  it('2. Support mixed verdicts across different atomic claims in one parent post', async () => {
    // Scenario F: Suketi bridge (Verified) + Hospital blackout (Conflicting)
    const claimF = await getClaimDoc('synth-claim-006');
    const resultF = await verifyClaimAtomics(claimF);
    const statusesF = resultF.verificationResults.map((r) => r.verificationStatus);
    expect(statusesF).toContain('Verified');
    expect(statusesF).toContain('Conflicting');

    // Scenario G: Flood inundation (Conflicting) + Casualty toll (Unverified)
    const claimG = await getClaimDoc('synth-claim-007');
    const resultG = await verifyClaimAtomics(claimG);
    const atomG1 = resultG.verificationResults.find((r) => r.atomicClaimId === 'atom-007-1');
    const atomG2 = resultG.verificationResults.find((r) => r.atomicClaimId === 'atom-007-2');
    expect(atomG1.verificationStatus).toBe('Conflicting');
    expect(atomG2.verificationStatus).toBe('Unverified');
  });

  // 3. Supporting and contradicting evidence for the same claim
  it('3. When credible evidence both supports and contradicts, Conflicting takes precedence and all evidence is retained', async () => {
    const claimG = await getClaimLean('synth-claim-007');
    const atomG1 = claimG.atomicClaims.find((a) => a.atomicClaimId === 'atom-007-1');

    const result = await determineVerificationStatus(atomG1, claimG);
    expect(result.verificationStatus).toBe('Conflicting');

    // Contradictory and supporting evidence must BOTH be preserved
    const roles = result.evidenceSummary.map((e) => e.role);
    expect(roles).toContain('supporting');
    expect(roles).toContain('contradicting');
    expect(result.linkedEvidenceIds.length).toBeGreaterThanOrEqual(2);
  });

  // 4. Geographic mismatch with precise evidence
  it('4. Geographic contradiction permissible when evidence explicitly establishes incompatibility', async () => {
    const claimD = await getClaimLean('synth-claim-004');
    const atomD = claimD.atomicClaims[0];

    const result = await determineVerificationStatus(atomD, claimD);
    expect(result.verificationStatus).toBe('Conflicting');
    const contraEvidence = result.evidenceSummary.find((e) => e.role === 'contradicting');
    expect(contraEvidence).toBeDefined();
    expect(contraEvidence.geographicRelevance.locationMatched).toBe(false);
  });

  // 5. Proximity alone is contextual, not proof
  it('5. A zero-distance match alone does not produce Verified or Conflicting', async () => {
    const dummyClaim = await Claim.create({
      originalText: 'Test post for geographic uncertainty',
      sourcePlatform: 'twitter',
      authorId: 'geo_user',
      isSynthetic: false
    });

    const dummyAtom = {
      atomicClaimId: 'atom-geo-test-1',
      claimText: 'Minor flood near river bank'
    };

    // A nearby record with locationMatched=true still has no supporting source role.
    const ev = await Evidence.create({
      claimId: dummyClaim._id,
      atomicClaimId: 'atom-geo-test-1',
      role: 'contextual',
      geographicRelevance: {
        locationMatched: true,
        distanceKm: 0,
        notes: 'Co-located point; no claim detail assessed'
      },
      explanation: 'Contextual regional weather reading from 95km away.',
      isSynthetic: false
    });

    try {
      const result = await determineVerificationStatus(dummyAtom, dummyClaim.toObject());
      // Distance zero must not upgrade a contextual record to Verified.
      expect(result.verificationStatus).toBe('Unverified');
    } finally {
      await Evidence.deleteOne({ _id: ev._id });
      await Claim.deleteOne({ _id: dummyClaim._id });
    }
  });

  // 6. Explicit supersession
  it('6. Explicit newer supersession returns Outdated', async () => {
    const claimC = await getClaimLean('synth-claim-003');
    const atomC = claimC.atomicClaims[0];

    const result = await determineVerificationStatus(atomC, claimC);
    expect(result.verificationStatus).toBe('Outdated');
    expect(result.evidenceSummary.some((e) => e.supersedes === true)).toBe(true);
  });

  // 7. Old reports without supersession
  it('7. Contradicting reports without explicit supersedes flag return Conflicting, not Outdated', async () => {
    const dummyClaim = await Claim.create({
      originalText: 'Test post for non-superseded contradiction',
      sourcePlatform: 'twitter',
      authorId: 'contra_user',
      publishedAt: new Date('2026-10-22T10:00:00.000Z'),
      isSynthetic: false
    });

    const dummyAtom = {
      atomicClaimId: 'atom-contra-no-supersede',
      claimText: 'Bridge is open to traffic'
    };

    // Contradicting evidence with an earlier timestamp, but supersedes is false
    const ev = await Evidence.create({
      claimId: dummyClaim._id,
      atomicClaimId: 'atom-contra-no-supersede',
      role: 'contradicting',
      supersedes: false,
      evidenceTimestamp: new Date('2026-10-22T08:00:00.000Z'),
      explanation: 'Authority previously recorded bridge closed.',
      isSynthetic: false
    });

    try {
      const result = await determineVerificationStatus(dummyAtom, dummyClaim.toObject());
      expect(result.verificationStatus).toBe('Conflicting');
    } finally {
      await Evidence.deleteOne({ _id: ev._id });
      await Claim.deleteOne({ _id: dummyClaim._id });
    }
  });

  // 8. Missing or inconsistent timestamps
  it('8. Missing or inconsistent timestamps with supersedes: true fall back to Conflicting', async () => {
    const dummyClaim = await Claim.create({
      originalText: 'Test post for timestamp edge cases',
      sourcePlatform: 'twitter',
      authorId: 'ts_user',
      publishedAt: null, // missing timestamp
      isSynthetic: false
    });

    const dummyAtom = {
      atomicClaimId: 'atom-ts-missing',
      claimText: 'Evacuation underway'
    };

    const ev = await Evidence.create({
      claimId: dummyClaim._id,
      atomicClaimId: 'atom-ts-missing',
      role: 'contradicting',
      supersedes: true,
      evidenceTimestamp: new Date('2026-10-22T08:00:00.000Z'),
      explanation: 'Cancellation bulletin issued.',
      isSynthetic: false
    });

    try {
      const result = await determineVerificationStatus(dummyAtom, dummyClaim.toObject());
      // Missing claim timestamp cannot prove temporal precedence -> Conflicting
      expect(result.verificationStatus).toBe('Conflicting');
    } finally {
      await Evidence.deleteOne({ _id: ev._id });
      await Claim.deleteOne({ _id: dummyClaim._id });
    }
  });

  // 9. Event confirmed but casualty/evacuation detail unsupported
  it('9. Event confirmed but specific casualty or material detail unsupported yields Unverified', async () => {
    const claimG = await getClaimLean('synth-claim-007');
    const atomDeathToll = claimG.atomicClaims.find((a) => a.atomicClaimId === 'atom-007-2');

    const result = await determineVerificationStatus(atomDeathToll, claimG);
    // Role is insufficient -> Unverified
    expect(result.verificationStatus).toBe('Unverified');
    expect(result.verificationExplanation).toMatch(/insufficient|no corroborating/i);
  });

  // 10. Repeated verification without duplicate evidence (Idempotency)
  it('10. Repeated verification calls do not create duplicate Evidence or alter verdicts', async () => {
    const claimDoc = await getClaimDoc('synth-claim-007');
    const initialEvidenceCount = await Evidence.countDocuments();

    // Run verification first time
    const res1 = await verifyClaimAtomics(claimDoc);
    const countAfterRun1 = await Evidence.countDocuments();
    expect(countAfterRun1).toBe(initialEvidenceCount);

    // Run verification second time
    const res2 = await verifyClaimAtomics(claimDoc);
    const countAfterRun2 = await Evidence.countDocuments();
    expect(countAfterRun2).toBe(initialEvidenceCount);

    // Verify via HTTP API as well
    const httpRes1 = await request(app).post(`/api/claims/${claimDoc._id}/verify`);
    const countAfterHttp1 = await Evidence.countDocuments();
    expect(countAfterHttp1).toBe(initialEvidenceCount);

    const httpRes2 = await request(app).post(`/api/claims/${claimDoc._id}/verify`);
    const countAfterHttp2 = await Evidence.countDocuments();
    expect(countAfterHttp2).toBe(initialEvidenceCount);

    // Compare results
    expect(res1.verificationResults).toEqual(res2.verificationResults);
    expect(httpRes1.body.meta.verificationResults).toEqual(httpRes2.body.meta.verificationResults);
  });

  // 11. No evidence correctly yielding Unverified
  it('11. Zero evidence documents correctly yields Unverified', async () => {
    const dummyClaim = {
      _id: new mongoose.Types.ObjectId(),
      publishedAt: new Date()
    };
    const dummyAtom = {
      atomicClaimId: 'atom-zero-evidence',
      claimText: 'Completely unreferenced rumor'
    };

    const result = await determineVerificationStatus(dummyAtom, dummyClaim);
    expect(result.verificationStatus).toBe('Unverified');
    expect(result.linkedEvidenceIds).toHaveLength(0);
    expect(result.evidenceSummary).toHaveLength(0);
  });
});
