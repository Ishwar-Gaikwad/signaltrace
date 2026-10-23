/**
 * SignalTrace — Phase 5: Incident Ingestion Service
 *
 * Generic, idempotent disaster incident report ingestion engine.
 * Coordinates feed fetching, validation, schema normalization, and database synchronization.
 *
 * Ingestion Guarantees:
 *   1. Idempotency: Repeated syncs with unchanged feeds produce 0 duplicates and 0 false updates.
 *   2. Staleness Guard: Older incoming reports never overwrite newer stored records (evaluated via updatedAtSource).
 *   3. Isolation: Synthetic benchmark datasets (isSynthetic: true) and other sources are never deleted or corrupted.
 *   4. Fault Tolerance: Partial batch item failures are recorded in the error log without terminating the full sync.
 *   5. Provenance: Preserves sourceName, sourceReportId, timestamps, and origin metadata.
 */

import { IncidentReport } from '../../models/index.js';
import { usgsEarthquakeAdapter } from './adapters/usgsEarthquakeAdapter.js';

/**
 * Synchronizes incident reports from an authoritative disaster feed adapter.
 *
 * @param {object} [adapter=usgsEarthquakeAdapter] - Source feed adapter
 * @param {object} [options] - Ingestion options passed to the adapter
 * @param {string} [options.feedUrl] - Override feed URL
 * @param {number} [options.timeoutMs] - Request timeout in ms
 * @param {number} [options.maxRecords] - Max items to process
 * @returns {Promise<{
 *   success: boolean,
 *   sourceName: string,
 *   fetched: number,
 *   validated: number,
 *   inserted: number,
 *   updated: number,
 *   skipped: number,
 *   failed: number,
 *   errors: Array<{ id: string, message: string }>
 * }>}
 */
export const syncIncidents = async (
  adapter = usgsEarthquakeAdapter,
  options = {}
) => {
  const summary = {
    success: false,
    sourceName: adapter.sourceName || 'Unknown Source',
    fetched: 0,
    validated: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: []
  };

  // 1. Fetch raw batch from source adapter
  let rawItems;
  try {
    rawItems = await adapter.fetchFeed(options);
  } catch (fetchError) {
    const errorDetails = {
      id: 'FEED_FETCH_FAILURE',
      message: fetchError.message,
      code: fetchError.code || 'FEED_ERROR'
    };
    summary.errors.push(errorDetails);
    return summary;
  }

  if (!Array.isArray(rawItems)) {
    summary.errors.push({
      id: 'FEED_INVALID_FORMAT',
      message: 'Adapter returned non-array payload'
    });
    return summary;
  }

  summary.fetched = rawItems.length;
  const retrievedAt = new Date();

  // 2. Process each item with per-item isolation
  for (const rawItem of rawItems) {
    // 2a. Validate
    const validation = adapter.validateFeature(rawItem);
    if (!validation.valid) {
      summary.failed++;
      summary.errors.push({
        id: String(rawItem?.id || `item_${summary.fetched - rawItems.length + 1}`),
        message: validation.error || 'Validation failed'
      });
      continue;
    }

    summary.validated++;

    // 2b. Normalize
    let normalized;
    try {
      normalized = adapter.normalizeFeature(rawItem, retrievedAt);
    } catch (normError) {
      summary.failed++;
      summary.errors.push({
        id: String(rawItem?.id || 'unknown'),
        message: `Normalization failed: ${normError.message}`
      });
      continue;
    }

    // 2c. Upsert with staleness guard
    try {
      const existing = await IncidentReport.findOne({
        sourceName: normalized.sourceName,
        sourceReportId: normalized.sourceReportId
      });

      if (!existing) {
        // Record does not exist -> Insert
        await IncidentReport.create(normalized);
        summary.inserted++;
      } else {
        // Record already exists -> Check if incoming version is strictly newer
        const incomingUpdated = normalized.updatedAtSource
          ? new Date(normalized.updatedAtSource).getTime()
          : null;
        const storedUpdated = existing.updatedAtSource
          ? new Date(existing.updatedAtSource).getTime()
          : null;

        const isIncomingStrictlyNewer =
          incomingUpdated !== null &&
          (storedUpdated === null || incomingUpdated > storedUpdated);

        if (isIncomingStrictlyNewer) {
          // Newer authoritative revision -> Update stored record
          await IncidentReport.updateOne(
            { _id: existing._id },
            { $set: normalized }
          );
          summary.updated++;
        } else {
          // Identical or older version -> Skip to preserve newer / existing state
          summary.skipped++;
        }
      }
    } catch (dbError) {
      summary.failed++;
      summary.errors.push({
        id: normalized.sourceReportId,
        message: `Database upsert failed: ${dbError.message}`
      });
    }
  }

  summary.success = summary.failed === 0 || (summary.inserted + summary.updated + summary.skipped) > 0;
  return summary;
};

export default {
  syncIncidents
};
