/**
 * SignalTrace Phase 7 — Incident Geographic Filtering & Validation Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { IncidentReport } from '../src/models/index.js';
import { getPaginatedIncidents } from '../src/services/incident.service.js';

const TEST_DB_URI = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/verialert_test_geo';

describe('Phase 7 — Incident Geographic Filtering & Integrity', () => {
  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_DB_URI);
    }
    await IncidentReport.deleteMany({});
  });

  afterEach(async () => {
    await IncidentReport.deleteMany({});
  });

  it('should retrieve only records with non-null coordinates when hasCoordinates=true', async () => {
    // Record with valid coordinates
    await IncidentReport.create({
      sourceReportId: 'GEO-TEST-001',
      sourceName: 'Official Geological Service',
      sourceType: 'geological_survey',
      eventType: 'earthquake',
      title: 'M 5.2 Test Earthquake',
      description: 'Test earthquake with valid coordinates.',
      geographicInfo: {
        locationName: 'Test Valley',
        coordinates: { latitude: 28.5, longitude: 84.2 }
      },
      publishedAt: new Date('2026-10-20T10:00:00Z'),
      isSynthetic: false
    });

    // Record with null coordinates
    await IncidentReport.create({
      sourceReportId: 'GEO-TEST-002',
      sourceName: 'Emergency Management',
      sourceType: 'emergency_management',
      eventType: 'flood',
      title: 'Broad Regional Advisory',
      description: 'Regional flood advisory without point coordinates.',
      geographicInfo: {
        locationName: 'North Basin',
        coordinates: { latitude: null, longitude: null }
      },
      publishedAt: new Date('2026-10-21T10:00:00Z'),
      isSynthetic: false
    });

    // Record with no geographicInfo at all
    await IncidentReport.create({
      sourceReportId: 'GEO-TEST-003',
      sourceName: 'Civil Defense',
      sourceType: 'official_agency',
      eventType: 'storm',
      title: 'National Cyclone Alert',
      description: 'National alert without geographicInfo.',
      geographicInfo: null,
      publishedAt: new Date('2026-10-22T10:00:00Z'),
      isSynthetic: true
    });

    // Query with hasCoordinates = true
    const { incidents, meta } = await getPaginatedIncidents({ hasCoordinates: true, limit: 10 });
    expect(meta.totalRecords).toBe(1);
    expect(incidents.length).toBe(1);
    expect(incidents[0].sourceReportId).toBe('GEO-TEST-001');
    expect(incidents[0].geographicInfo.coordinates.latitude).toBe(28.5);
    expect(incidents[0].geographicInfo.coordinates.longitude).toBe(84.2);

    // Query without hasCoordinates (returns all 3)
    const allResult = await getPaginatedIncidents({ limit: 10 });
    expect(allResult.meta.totalRecords).toBe(3);
  });

  it('should accurately filter by date range on publishedAt', async () => {
    await IncidentReport.create([
      {
        sourceReportId: 'DATE-001',
        sourceName: 'Source A',
        sourceType: 'official_agency',
        eventType: 'flood',
        title: 'October 10 Flood',
        description: 'Older flood event.',
        publishedAt: new Date('2026-10-10T00:00:00Z')
      },
      {
        sourceReportId: 'DATE-002',
        sourceName: 'Source B',
        sourceType: 'official_agency',
        eventType: 'flood',
        title: 'October 20 Flood',
        description: 'Mid-month event.',
        publishedAt: new Date('2026-10-20T00:00:00Z')
      },
      {
        sourceReportId: 'DATE-003',
        sourceName: 'Source C',
        sourceType: 'official_agency',
        eventType: 'flood',
        title: 'October 30 Flood',
        description: 'Recent flood event.',
        publishedAt: new Date('2026-10-30T00:00:00Z')
      }
    ]);

    const result = await getPaginatedIncidents({
      startDate: '2026-10-15T00:00:00Z',
      endDate: '2026-10-25T00:00:00Z'
    });

    expect(result.meta.totalRecords).toBe(1);
    expect(result.incidents[0].sourceReportId).toBe('DATE-002');
  });

  it('should preserve live and synthetic provenance metadata and coordinates', async () => {
    await IncidentReport.create([
      {
        sourceReportId: 'PROV-LIVE',
        sourceName: 'USGS Earthquake Hazards Program',
        sourceType: 'geological_survey',
        eventType: 'earthquake',
        title: 'M 6.1 - Hindu Kush',
        description: 'Live ingested earthquake record.',
        geographicInfo: {
          locationName: 'Hindu Kush Region',
          coordinates: { latitude: 36.4, longitude: 70.8 }
        },
        isSynthetic: false
      },
      {
        sourceReportId: 'PROV-SYNTH',
        sourceName: 'Central Water Commission (Synthetic)',
        sourceType: 'official_agency',
        eventType: 'flood',
        title: '[SYNTHETIC] Teesta Flood Advisory',
        description: 'Synthetic evaluation benchmark.',
        geographicInfo: {
          locationName: 'Domohani',
          coordinates: { latitude: 26.54, longitude: 88.72 }
        },
        isSynthetic: true
      }
    ]);

    const liveOnly = await getPaginatedIncidents({ isSynthetic: false });
    expect(liveOnly.incidents.length).toBe(1);
    expect(liveOnly.incidents[0].isSynthetic).toBe(false);
    expect(liveOnly.incidents[0].sourceName).toBe('USGS Earthquake Hazards Program');

    const synthOnly = await getPaginatedIncidents({ isSynthetic: true });
    expect(synthOnly.incidents.length).toBe(1);
    expect(synthOnly.incidents[0].isSynthetic).toBe(true);
    expect(synthOnly.incidents[0].sourceName).toBe('Central Water Commission (Synthetic)');
  });
});
