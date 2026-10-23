import { Claim, IncidentReport, Evidence } from '../models/index.js';
import {
  syntheticIncidents,
  syntheticClaims,
  syntheticEvidence
} from '../data/syntheticDisasterData.js';

/**
 * Idempotently seeds the database with synthetic disaster data.
 * Safe to rerun repeatedly:
 * - Upserts records using unique syntheticId
 * - Never modifies or removes user-created (non-synthetic) data
 * - Avoids full-database drop or wipe commands
 *
 * @returns {Promise<object>} Summary of seeded records
 */
export const seedSyntheticData = async () => {
  console.log('[Seeder] Starting deterministic synthetic dataset population...');

  // 1. Upsert Incident Reports
  const incidentMap = new Map();
  for (const incidentData of syntheticIncidents) {
    const doc = await IncidentReport.findOneAndUpdate(
      { syntheticId: incidentData.syntheticId },
      { $set: incidentData },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    incidentMap.set(incidentData.syntheticId, doc._id);
  }
  console.log(`[Seeder] Upserted ${syntheticIncidents.length} synthetic incident reports.`);

  // 2. Upsert Claims
  const claimMap = new Map();
  for (const claimData of syntheticClaims) {
    const doc = await Claim.findOneAndUpdate(
      { syntheticId: claimData.syntheticId },
      { $set: claimData },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    claimMap.set(claimData.syntheticId, doc._id);
  }
  console.log(`[Seeder] Upserted ${syntheticClaims.length} synthetic claims.`);

  // 3. Upsert Evidence linking claims and incident reports
  const evidenceResults = [];
  for (const evidenceData of syntheticEvidence) {
    const claimObjectId = claimMap.get(evidenceData.claimSyntheticId);
    if (!claimObjectId) {
      throw new Error(`Referenced claim '${evidenceData.claimSyntheticId}' not found for evidence '${evidenceData.syntheticId}'`);
    }

    const incidentObjectIds = (evidenceData.incidentReportSyntheticIds || [])
      .map((sid) => incidentMap.get(sid))
      .filter(Boolean);

    const evidenceDocData = {
      claimId: claimObjectId,
      atomicClaimId: evidenceData.atomicClaimId,
      incidentReportIds: incidentObjectIds,
      excerpts: evidenceData.excerpts,
      role: evidenceData.role,
      // supersedes: explicit structural flag used by the verification engine for OUTDATED classification
      supersedes: evidenceData.supersedes ?? false,
      evidenceTimestamp: evidenceData.evidenceTimestamp,
      geographicRelevance: evidenceData.geographicRelevance,
      explanation: evidenceData.explanation,
      isSynthetic: true,
      syntheticId: evidenceData.syntheticId
    };

    const doc = await Evidence.findOneAndUpdate(
      { syntheticId: evidenceData.syntheticId },
      { $set: evidenceDocData },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    evidenceResults.push(doc);
  }
  console.log(`[Seeder] Upserted ${syntheticEvidence.length} synthetic evidence items.`);

  // 4. Verify counts for confirmation
  const totalSyntheticIncidents = await IncidentReport.countDocuments({ isSynthetic: true });
  const totalSyntheticClaims = await Claim.countDocuments({ isSynthetic: true });
  const totalSyntheticEvidence = await Evidence.countDocuments({ isSynthetic: true });

  const summary = {
    incidentsCount: totalSyntheticIncidents,
    claimsCount: totalSyntheticClaims,
    evidenceCount: totalSyntheticEvidence,
    deterministic: true
  };

  console.log('[Seeder] Synthetic seeding completed successfully:', summary);
  return summary;
};
