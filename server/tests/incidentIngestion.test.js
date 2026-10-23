/**
 * Phase 5 — Incident Ingestion Service Tests
 *
 * Validates:
 *   - Feed synchronization and database persistence
 *   - Strict idempotency (repeated syncs create 0 duplicates)
 *   - Staleness guard: older updates never overwrite newer stored records
 *   - Newer updates successfully update stored records
 *   - Partial batch failures with exact counter tracking
 *   - Isolation of synthetic records (synthetic data remains untouched)
 *   - Verification engine / IncidentReport schema compatibility
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { IncidentReport } from '../src/models/index.js';
import { syncIncidents } from '../src/services/ingestion/incidentIngestion.service.js';
import { usgsEarthquakeAdapter, USGS_SOURCE_NAME } from '../src/services/ingestion/adapters/usgsEarthquakeAdapter.js';
import { seedSyntheticData } from '../src/services/seed.service.js';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/verialert_test';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }
  // Ensure synthetic baseline is seeded
  await seedSyntheticData();
});

afterAll(async () => {
  // Clean up any test ingested live records
  await IncidentReport.deleteMany({ isSynthetic: false, sourceName: USGS_SOURCE_NAME });
  await mongoose.disconnect();
});

// Helper: build a mock adapter returning controlled fixtures
function createMockAdapter(features) {
  return {
    ...usgsEarthquakeAdapter,
    fetchFeed: async () => features
  };
}

describe('Phase 5 — Incident Ingestion Service', () => {

  beforeEach(async () => {
    // Clear live ingested records before each test for clean isolation
    await IncidentReport.deleteMany({ isSynthetic: false, sourceName: USGS_SOURCE_NAME });
  });

  it('should successfully ingest new valid incident reports into the database', async () => {
    const mockFeatures = [
      {
        type: 'Feature',
        id: 'mock_eq_101',
        properties: {
          mag: 5.8,
          place: '45 km N of Mandalay, Myanmar',
          time: 1792750000000,
          updated: 1792750100000,
          url: 'https://mock.usgs.example/101',
          status: 'reviewed',
          title: 'M 5.8 - 45 km N of Mandalay, Myanmar'
        },
        geometry: {
          type: 'Point',
          coordinates: [96.08, 22.38, 12.0]
        }
      },
      {
        type: 'Feature',
        id: 'mock_eq_102',
        properties: {
          mag: 4.2,
          place: '15 km W of Santiago, Chile',
          time: 1792750050000,
          updated: 1792750120000,
          url: 'https://mock.usgs.example/102',
          status: 'automatic',
          title: 'M 4.2 - 15 km W of Santiago, Chile'
        },
        geometry: {
          type: 'Point',
          coordinates: [-70.82, -33.45, 45.0]
        }
      }
    ];

    const mockAdapter = createMockAdapter(mockFeatures);
    const result = await syncIncidents(mockAdapter);

    expect(result.success).toBe(true);
    expect(result.sourceName).toBe(USGS_SOURCE_NAME);
    expect(result.fetched).toBe(2);
    expect(result.validated).toBe(2);
    expect(result.inserted).toBe(2);
    expect(result.updated).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.failed).toBe(0);

    // Verify database documents
    const doc1 = await IncidentReport.findOne({ sourceName: USGS_SOURCE_NAME, sourceReportId: 'mock_eq_101' });
    expect(doc1).not.toBeNull();
    expect(doc1.eventType).toBe('earthquake');
    expect(doc1.severity).toBe('moderate');
    expect(doc1.isSynthetic).toBe(false);
    expect(doc1.geographicInfo.coordinates.latitude).toBe(22.38);
    expect(doc1.geographicInfo.coordinates.longitude).toBe(96.08);

    const doc2 = await IncidentReport.findOne({ sourceName: USGS_SOURCE_NAME, sourceReportId: 'mock_eq_102' });
    expect(doc2).not.toBeNull();
    expect(doc2.severity).toBe('minor');
  });

  it('should be strictly idempotent on repeated syncs (0 duplicates, all skipped)', async () => {
    const mockFeatures = [
      {
        type: 'Feature',
        id: 'mock_eq_idempotent_1',
        properties: {
          mag: 6.1,
          place: 'Honshu, Japan',
          time: 1792750000000,
          updated: 1792750200000,
          title: 'M 6.1 - Honshu, Japan'
        },
        geometry: {
          type: 'Point',
          coordinates: [142.0, 38.5, 20.0]
        }
      }
    ];

    const mockAdapter = createMockAdapter(mockFeatures);

    // First execution: inserts 1 record
    const run1 = await syncIncidents(mockAdapter);
    expect(run1.inserted).toBe(1);
    expect(run1.skipped).toBe(0);

    const countAfterRun1 = await IncidentReport.countDocuments({
      sourceName: USGS_SOURCE_NAME,
      sourceReportId: 'mock_eq_idempotent_1'
    });
    expect(countAfterRun1).toBe(1);

    // Second execution with identical payload: skips 1 record (0 inserted, 0 updated)
    const run2 = await syncIncidents(mockAdapter);
    expect(run2.inserted).toBe(0);
    expect(run2.updated).toBe(0);
    expect(run2.skipped).toBe(1);

    const countAfterRun2 = await IncidentReport.countDocuments({
      sourceName: USGS_SOURCE_NAME,
      sourceReportId: 'mock_eq_idempotent_1'
    });
    expect(countAfterRun2).toBe(1); // Document count unchanged
  });

  it('staleness guard: older incoming update must not overwrite newer stored record', async () => {
    // 1. Initial sync with version updated at t=2000
    const initialFeature = {
      type: 'Feature',
      id: 'mock_eq_staleness_test',
      properties: {
        mag: 5.0,
        place: 'Initial Observation',
        time: 1792750000000,
        updated: 1792750200000, // t = 2000
        title: 'M 5.0 - Initial Observation'
      },
      geometry: { type: 'Point', coordinates: [100.0, 10.0] }
    };

    await syncIncidents(createMockAdapter([initialFeature]));

    // 2. Incoming feed has an older timestamp (e.g. cached response from t=1000)
    const olderFeature = {
      type: 'Feature',
      id: 'mock_eq_staleness_test',
      properties: {
        mag: 4.8, // older uncalibrated magnitude
        place: 'Older Stale Place',
        time: 1792750000000,
        updated: 1792750100000, // t = 1000 (OLDER than 2000!)
        title: 'M 4.8 - Older Stale Place'
      },
      geometry: { type: 'Point', coordinates: [100.0, 10.0] }
    };

    const staleResult = await syncIncidents(createMockAdapter([olderFeature]));
    expect(staleResult.updated).toBe(0);
    expect(staleResult.skipped).toBe(1);

    // Verify stored record retained initial magnitude and title
    const stored = await IncidentReport.findOne({
      sourceName: USGS_SOURCE_NAME,
      sourceReportId: 'mock_eq_staleness_test'
    });
    expect(stored.title).toBe('M 5.0 - Initial Observation');
    expect(stored.rawPayload.mag).toBe(5.0);
  });

  it('should update stored record when incoming feed has a strictly newer updatedAtSource', async () => {
    // 1. Insert initial record with t=2000
    const initialFeature = {
      type: 'Feature',
      id: 'mock_eq_update_test',
      properties: {
        mag: 5.5,
        place: 'Preliminary Detection',
        time: 1792750000000,
        updated: 1792750200000, // t = 2000
        title: 'M 5.5 - Preliminary Detection'
      },
      geometry: { type: 'Point', coordinates: [85.0, 27.0] }
    };

    await syncIncidents(createMockAdapter([initialFeature]));

    // 2. Incoming feed has reviewed/refined data at t=5000
    const newerFeature = {
      type: 'Feature',
      id: 'mock_eq_update_test',
      properties: {
        mag: 5.7, // refined magnitude
        place: 'Reviewed: 18 km NE of Kathmandu, Nepal',
        time: 1792750000000,
        updated: 1792750500000, // t = 5000 (NEWER!)
        title: 'M 5.7 - 18 km NE of Kathmandu, Nepal'
      },
      geometry: { type: 'Point', coordinates: [85.4, 27.8] }
    };

    const updateResult = await syncIncidents(createMockAdapter([newerFeature]));
    expect(updateResult.inserted).toBe(0);
    expect(updateResult.updated).toBe(1);
    expect(updateResult.skipped).toBe(0);

    const updatedDoc = await IncidentReport.findOne({
      sourceName: USGS_SOURCE_NAME,
      sourceReportId: 'mock_eq_update_test'
    });
    expect(updatedDoc.title).toBe('M 5.7 - 18 km NE of Kathmandu, Nepal');
    expect(updatedDoc.rawPayload.mag).toBe(5.7);
    expect(updatedDoc.updatedAtSource).toEqual(new Date(1792750500000));
  });

  it('should handle partial batch failures gracefully and record accurate counters', async () => {
    const mixedBatch = [
      // Valid item 1
      {
        type: 'Feature',
        id: 'valid_partial_1',
        properties: { time: 1792750000000, mag: 4.5, place: 'Valid Location' },
        geometry: { type: 'Point', coordinates: [10.0, 20.0] }
      },
      // Invalid item (missing id)
      {
        type: 'Feature',
        id: '', // invalid!
        properties: { time: 1792750000000, mag: 3.0 }
      },
      // Valid item 2
      {
        type: 'Feature',
        id: 'valid_partial_2',
        properties: { time: 1792750000000, mag: 6.2, place: 'Second Valid' },
        geometry: { type: 'Point', coordinates: [15.0, 25.0] }
      }
    ];

    const result = await syncIncidents(createMockAdapter(mixedBatch));

    expect(result.fetched).toBe(3);
    expect(result.validated).toBe(2);
    expect(result.inserted).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toMatch(/id is missing/i);

    // Confirm the two valid items were committed
    const doc1 = await IncidentReport.findOne({ sourceReportId: 'valid_partial_1' });
    const doc2 = await IncidentReport.findOne({ sourceReportId: 'valid_partial_2' });
    expect(doc1).not.toBeNull();
    expect(doc2).not.toBeNull();
  });

  it('should never modify, overwrite, or delete synthetic baseline records', async () => {
    const syntheticCountBefore = await IncidentReport.countDocuments({ isSynthetic: true });
    expect(syntheticCountBefore).toBeGreaterThanOrEqual(7);

    // Sync mock live feed
    const liveBatch = [
      {
        type: 'Feature',
        id: 'live_test_isolation',
        properties: { time: 1792750000000, mag: 5.1, place: 'Live Test City' },
        geometry: { type: 'Point', coordinates: [50.0, 50.0] }
      }
    ];

    await syncIncidents(createMockAdapter(liveBatch));

    // Verify synthetic count and records remain untouched
    const syntheticCountAfter = await IncidentReport.countDocuments({ isSynthetic: true });
    expect(syntheticCountAfter).toBe(syntheticCountBefore);

    const syntheticTeesta = await IncidentReport.findOne({ syntheticId: 'synth-incident-001' });
    expect(syntheticTeesta).not.toBeNull();
    expect(syntheticTeesta.isSynthetic).toBe(true);
    expect(syntheticTeesta.sourceName).toContain('Central Water Commission');
  });

  it('should handle feed fetch failure gracefully with informative error summary', async () => {
    const failingAdapter = {
      ...usgsEarthquakeAdapter,
      fetchFeed: async () => {
        const err = new Error('Network connection timeout');
        err.code = 'FEED_TIMEOUT';
        throw err;
      }
    };

    const result = await syncIncidents(failingAdapter);
    expect(result.success).toBe(false);
    expect(result.fetched).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe('FEED_TIMEOUT');
    expect(result.errors[0].message).toMatch(/timeout/i);
  });
});
