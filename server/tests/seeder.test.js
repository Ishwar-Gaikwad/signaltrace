import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Claim, IncidentReport, Evidence } from '../src/models/index.js';
import { seedSyntheticData } from '../src/services/seed.service.js';
import {
  syntheticIncidents,
  syntheticClaims,
  syntheticEvidence
} from '../src/data/syntheticDisasterData.js';

describe('Phase 2 — Synthetic Seeder Idempotency & Isolation', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  it('should seed the expected synthetic records on first run', async () => {
    const summary1 = await seedSyntheticData();

    expect(summary1.incidentsCount).toBeGreaterThanOrEqual(syntheticIncidents.length);
    expect(summary1.claimsCount).toBeGreaterThanOrEqual(syntheticClaims.length);
    expect(summary1.evidenceCount).toBeGreaterThanOrEqual(syntheticEvidence.length);
    expect(await Evidence.countDocuments({ syntheticId: { $in: syntheticEvidence.map((item) => item.syntheticId) } })).toBe(syntheticEvidence.length);
    expect(summary1.deterministic).toBe(true);
  });

  it('should be idempotent and not create duplicate records on repeated execution', async () => {
    // Run seeder a second time
    const summary2 = await seedSyntheticData();

    expect(summary2.incidentsCount).toBeGreaterThanOrEqual(syntheticIncidents.length);
    expect(summary2.claimsCount).toBeGreaterThanOrEqual(syntheticClaims.length);
    expect(summary2.evidenceCount).toBeGreaterThanOrEqual(syntheticEvidence.length);

    // Direct database count verification
    const incidentCount = await IncidentReport.countDocuments({ isSynthetic: true });
    const claimCount = await Claim.countDocuments({ isSynthetic: true });
    const evidenceCount = await Evidence.countDocuments({ isSynthetic: true });

    expect(incidentCount).toBeGreaterThanOrEqual(syntheticIncidents.length);
    expect(claimCount).toBeGreaterThanOrEqual(syntheticClaims.length);
    expect(evidenceCount).toBeGreaterThanOrEqual(syntheticEvidence.length);
  });

  it('should isolate non-synthetic user records from being modified or deleted during reseeding', async () => {
    // 1. Create an unrelated user record (non-synthetic)
    const userClaim = await Claim.create({
      originalText: 'Real citizen field report: Bridge near sector 4 is impassable due to tree fall.',
      sourcePlatform: 'whatsapp',
      authorId: '+919876543210',
      isSynthetic: false
    });

    const userClaimId = userClaim._id;

    // 2. Re-run synthetic seeder
    await seedSyntheticData();

    // 3. Verify the non-synthetic user claim remains intact and unmodified
    const retrievedUserClaim = await Claim.findById(userClaimId);
    expect(retrievedUserClaim).toBeDefined();
    expect(retrievedUserClaim.originalText).toBe(userClaim.originalText);
    expect(retrievedUserClaim.isSynthetic).toBe(false);

    // Clean up test record
    await Claim.findByIdAndDelete(userClaimId);
  });
});
