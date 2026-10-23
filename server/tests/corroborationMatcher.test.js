import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { Claim, IncidentReport, Evidence } from '../src/models/index.js';
import { matchAndCorroborateClaim } from '../src/services/verification/corroborationMatcher.service.js';
import { seedSyntheticData } from '../src/services/seed.service.js';
import { verifyClaimAtomics } from '../src/services/verification/verificationEngine.js';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/verialert_test';

describe('Dynamic Corroboration Matcher & Verification Integration', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
    }
    await seedSyntheticData();
  });

  afterAll(async () => {
    await Claim.deleteMany({ isSynthetic: false });
    await Evidence.deleteMany({ isSynthetic: false });
    await mongoose.disconnect();
  });

  it('should dynamically corroborate a live claim matching stored incident data', async () => {
    // Custom user claim without pre-seeded evidence
    const claim = await Claim.create({
      originalText: 'Severe flood advisory on Teesta River near Jalpaiguri with rising water levels.',
      sourcePlatform: 'web-submission',
      isSynthetic: false,
      publishedAt: new Date(),
      atomicClaims: [
        {
          atomicClaimId: 'ac-1',
          text: 'Severe flood advisory on Teesta River near Jalpaiguri with rising water levels.',
          claimType: 'event'
        }
      ]
    });

    const generatedCount = await matchAndCorroborateClaim(claim);
    expect(generatedCount).toBeGreaterThan(0);

    const evidenceList = await Evidence.find({ claimId: claim._id });
    expect(evidenceList.length).toBeGreaterThan(0);
    expect(evidenceList[0].role).toBe('supporting');
    expect(evidenceList[0].excerpts.length).toBeGreaterThan(0);

    // Verify that the verification engine consumes this evidence and returns Verified
    const verifyResult = await verifyClaimAtomics(claim);
    expect(verifyResult.verificationResults[0].verificationStatus).toBe('Verified');
  });

  it('should dynamically identify contradiction when claim asserts inflated magnitude', async () => {
    const claim = await Claim.create({
      originalText: 'MASSIVE Magnitude 7.8 earthquake just hit Chamoli Uttarakhand!',
      sourcePlatform: 'twitter',
      isSynthetic: false,
      publishedAt: new Date(),
      atomicClaims: [
        {
          atomicClaimId: 'ac-1',
          text: 'MASSIVE Magnitude 7.8 earthquake just hit Chamoli Uttarakhand!',
          claimType: 'event'
        }
      ]
    });

    const verifyResult = await verifyClaimAtomics(claim);
    expect(verifyResult.verificationResults[0].verificationStatus).toBe('Conflicting');
    expect(verifyResult.verificationResults[0].verificationExplanation).toContain('Contradicts official measurement');
  });

  it('should be strictly idempotent and not duplicate Evidence on rerun', async () => {
    const claim = await Claim.create({
      originalText: 'Flood warning for Teesta river.',
      sourcePlatform: 'web-submission',
      isSynthetic: false,
      atomicClaims: [
        {
          atomicClaimId: 'ac-1',
          text: 'Flood warning for Teesta river.',
          claimType: 'event'
        }
      ]
    });

    const count1 = await matchAndCorroborateClaim(claim);
    const count2 = await matchAndCorroborateClaim(claim);
    expect(count2).toBe(count1);

    const totalDocs = await Evidence.countDocuments({ claimId: claim._id });
    expect(totalDocs).toBe(count1);
  });
});
