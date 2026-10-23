import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { Claim, IncidentReport, Evidence } from '../src/models/index.js';
import { matchAndCorroborateClaim } from '../src/services/verification/corroborationMatcher.service.js';
import { seedSyntheticData } from '../src/services/seed.service.js';
import { verifyClaimAtomics } from '../src/services/verification/verificationEngine.js';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/verialert_test';
const testSource = 'Integrity regression test source';
const madeClaimIds = [];
const madeIncidentIds = [];

async function makeClaim(text, { isSynthetic = false, publishedAt = new Date('2026-10-20T12:00:00.000Z'), city } = {}) {
  const claim = await Claim.create({
    originalText: text,
    sourcePlatform: isSynthetic ? 'synthetic-demo' : 'web-submission',
    isSynthetic,
    publishedAt,
    claimedLocation: city ? { city } : null,
    atomicClaims: [{ atomicClaimId: 'atom-1', text, claimType: 'event', ...(city ? { location: { city } } : {}) }]
  });
  madeClaimIds.push(claim._id);
  return claim;
}

async function makeIncident({ id, eventType = 'flood', title, description, city, publishedAt, isSynthetic = false }) {
  const incident = await IncidentReport.create({
    sourceReportId: id,
    sourceName: testSource,
    sourceType: 'official_agency',
    sourceUrl: 'https://agency.example/reports/' + id,
    eventType,
    title,
    description,
    severity: 'severe',
    geographicInfo: { locationName: city, adminRegion: city, country: 'Testland' },
    publishedAt,
    retrievedAt: new Date(),
    rawPayload: {},
    isSynthetic
  });
  madeIncidentIds.push(incident._id);
  return incident;
}

describe('Verification matcher provenance and source-shaped regression tests', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) await mongoose.connect(MONGO_URI);
    await seedSyntheticData();
  });

  afterAll(async () => {
    await Evidence.deleteMany({ claimId: { $in: madeClaimIds } });
    await Claim.deleteMany({ _id: { $in: madeClaimIds } });
    await IncidentReport.deleteMany({ _id: { $in: madeIncidentIds } });
    await mongoose.disconnect();
  });

  it('uses a same-provenance, same-hazard, named-location report as support and preserves its source excerpt', async () => {
    await makeIncident({
      id: 'integrity-flood-match-1', city: 'Jalpaiguri',
      title: 'Teesta flood advisory for Jalpaiguri',
      description: 'Flood water levels have crossed the danger mark on the Teesta River near Jalpaiguri.',
      publishedAt: new Date('2026-10-20T11:00:00.000Z')
    });
    const claim = await makeClaim('Flood water levels crossed the danger mark on the Teesta River near Jalpaiguri.', { city: 'Jalpaiguri' });
    const result = await verifyClaimAtomics(claim);
    expect(result.verificationResults[0].verificationStatus).toBe('Verified');
    expect(result.verificationResults[0].evidenceSummary[0].excerpts[0].excerptText).toContain('Flood water levels');
    expect(result.verificationResults[0].evidenceSummary[0].isSynthetic).toBe(false);
  });

  it('never uses a synthetic demonstration report as live corroboration', async () => {
    const claim = await makeClaim('Flood warning on the Teesta River near Domohani Jalpaiguri.', { city: 'Domohani' });
    const result = await verifyClaimAtomics(claim);
    expect(result.verificationResults[0].verificationStatus).toBe('Unverified');
    expect(result.verificationResults[0].evidenceSummary.every((ev) => !ev.isSynthetic)).toBe(true);
    expect(result.verificationResults[0].verificationExplanation).toMatch(/live report/i);
  });

  it('retains DEMO provenance for synthetic claims and their evidence', async () => {
    const claim = await makeClaim('Flood warning on the Teesta River near Domohani Jalpaiguri.', { isSynthetic: true, city: 'Domohani' });
    const result = await verifyClaimAtomics(claim);
    expect(result.verificationResults[0].evidenceSummary.length).toBeGreaterThan(0);
    expect(result.verificationResults[0].evidenceSummary.every((ev) => ev.isSynthetic)).toBe(true);
  });

  it('does not match an unrelated incident merely because its hazard is the same', async () => {
    await makeIncident({ id: 'integrity-quake-chamoli', eventType: 'earthquake', city: 'Chamoli', title: 'Chamoli earthquake bulletin', description: 'A magnitude 5.4 earthquake occurred near Chamoli.', publishedAt: new Date() });
    const claim = await makeClaim('A magnitude 7.2 earthquake struck Kathmandu Nepal.', { city: 'Kathmandu' });
    const result = await verifyClaimAtomics(claim);
    expect(result.verificationResults[0].verificationStatus).toBe('Unverified');
    expect(result.verificationResults[0].evidenceSummary.every((ev) => ev.role === 'insufficient')).toBe(true);
  });

  it('does not support an unsupported casualty figure when a report only confirms the event', async () => {
    await makeIncident({ id: 'integrity-flood-no-casualties', city: 'Supaul', title: 'Kosi flood at Supaul', description: 'Flooding inundated low-lying parts of Supaul district.', publishedAt: new Date() });
    const claim = await makeClaim('Flooding in Supaul killed 200 people.', { city: 'Supaul' });
    const result = await verifyClaimAtomics(claim);
    expect(result.verificationResults[0].verificationStatus).toBe('Unverified');
    expect(result.verificationResults[0].evidenceSummary.some((ev) => ev.role === 'contextual')).toBe(true);
  });

  it('classifies a newer explicit correction as Outdated, but not a newer routine report', async () => {
    await makeIncident({ id: 'integrity-cyclone-correction', eventType: 'cyclone', city: 'Paradip', title: 'Cyclone Sagar red alert withdrawn for Paradip', description: 'The earlier evacuation order is cancelled; the alert is withdrawn for Paradip.', publishedAt: new Date('2026-10-20T14:00:00.000Z') });
    const oldClaim = await makeClaim('Cyclone Sagar evacuation order is currently active for Paradip.', { city: 'Paradip', publishedAt: new Date('2026-10-20T12:30:00.000Z') });
    const outdated = await verifyClaimAtomics(oldClaim);
    expect(outdated.verificationResults[0].verificationStatus).toBe('Outdated');

    await makeIncident({ id: 'integrity-cyclone-routine', eventType: 'cyclone', city: 'Puri', title: 'Cyclone Sagar observation update for Puri', description: 'Wind observations continue over the Bay of Bengal near Puri.', publishedAt: new Date('2026-10-20T15:00:00.000Z') });
    const routineClaim = await makeClaim('Cyclone Sagar evacuation order is currently active for Puri.', { city: 'Puri', publishedAt: new Date('2026-10-20T12:30:00.000Z') });
    const routine = await verifyClaimAtomics(routineClaim);
    expect(routine.verificationResults[0].verificationStatus).not.toBe('Outdated');
  });

  it('does not classify correction evidence as Outdated when timestamps are missing', async () => {
    await makeIncident({ id: 'integrity-cyclone-no-time', eventType: 'cyclone', city: 'Paradip', title: 'Cyclone alert cancelled for Paradip', description: 'Evacuation order cancelled; red alert withdrawn for Paradip.', publishedAt: null });
    const claim = await makeClaim('Cyclone evacuation order is currently active for Paradip.', { city: 'Paradip', publishedAt: null });
    const result = await verifyClaimAtomics(claim);
    expect(result.verificationResults[0].verificationStatus).toBe('Conflicting');
    expect(result.verificationResults[0].evidenceSummary.some((ev) => ev.supersedes)).toBe(false);
  });
});
