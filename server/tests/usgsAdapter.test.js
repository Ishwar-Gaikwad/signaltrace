/**
 * Phase 5 — USGS Earthquake Adapter Unit Tests
 *
 * Validates GeoJSON parsing, schema normalization, severity mapping,
 * edge cases (missing optional fields, out-of-bounds coordinates),
 * invalid feature validation, and HTTP failure / timeout handling.
 *
 * All automated tests in this file run with deterministic fixtures
 * and do not require live network access.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  usgsEarthquakeAdapter,
  mapSeverity,
  validateFeature,
  normalizeFeature,
  fetchFeed,
  USGS_SOURCE_NAME,
  USGS_SOURCE_TYPE
} from '../src/services/ingestion/adapters/usgsEarthquakeAdapter.js';

describe('Phase 5 — USGS Earthquake Adapter', () => {

  describe('mapSeverity helper', () => {
    it('should map standard magnitudes correctly', () => {
      expect(mapSeverity(7.8)).toBe('extreme');
      expect(mapSeverity(7.0)).toBe('extreme');
      expect(mapSeverity(6.5)).toBe('severe');
      expect(mapSeverity(6.0)).toBe('severe');
      expect(mapSeverity(5.4)).toBe('moderate');
      expect(mapSeverity(4.5)).toBe('moderate');
      expect(mapSeverity(3.2)).toBe('minor');
      expect(mapSeverity(0.5)).toBe('minor');
    });

    it('should return "unknown" for null, undefined, or NaN magnitude', () => {
      expect(mapSeverity(null)).toBe('unknown');
      expect(mapSeverity(undefined)).toBe('unknown');
      expect(mapSeverity(NaN)).toBe('unknown');
      expect(mapSeverity('invalid')).toBe('unknown');
    });

    it('should prioritize PAGER alert color when provided', () => {
      expect(mapSeverity(5.0, 'red')).toBe('extreme');
      expect(mapSeverity(5.0, 'orange')).toBe('severe');
      expect(mapSeverity(7.5, 'yellow')).toBe('moderate');
      expect(mapSeverity(7.5, 'green')).toBe('minor');
    });
  });

  describe('validateFeature', () => {
    it('should approve valid GeoJSON feature with id and time', () => {
      const valid = {
        type: 'Feature',
        id: 'us7000test',
        properties: {
          time: 1792750000000,
          mag: 5.2,
          place: '12 km N of Testville'
        }
      };
      const res = validateFeature(valid);
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('should reject null or non-object feature', () => {
      expect(validateFeature(null).valid).toBe(false);
      expect(validateFeature(undefined).valid).toBe(false);
      expect(validateFeature('not an object').valid).toBe(false);
    });

    it('should reject feature missing id', () => {
      const missingId = {
        type: 'Feature',
        properties: { time: 1792750000000 }
      };
      const res = validateFeature(missingId);
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/id is missing/i);
    });

    it('should reject feature missing properties', () => {
      const missingProps = { type: 'Feature', id: 'us7000test' };
      const res = validateFeature(missingProps);
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/properties/i);
    });

    it('should reject feature with missing or invalid time', () => {
      const missingTime = {
        type: 'Feature',
        id: 'us7000test',
        properties: { mag: 4.0 }
      };
      expect(validateFeature(missingTime).valid).toBe(false);

      const invalidTime = {
        type: 'Feature',
        id: 'us7000test',
        properties: { time: 'not-a-timestamp' }
      };
      expect(validateFeature(invalidTime).valid).toBe(false);
    });
  });

  describe('normalizeFeature', () => {
    const sampleFeature = {
      type: 'Feature',
      id: 'us7000eq99',
      properties: {
        mag: 6.3,
        place: '35 km SSW of Chamoli, India',
        time: 1792750674000,
        updated: 1792751000000,
        url: 'https://earthquake.usgs.gov/earthquakes/eventpage/us7000eq99',
        status: 'reviewed',
        magType: 'mww',
        title: 'M 6.3 - 35 km SSW of Chamoli, India'
      },
      geometry: {
        type: 'Point',
        coordinates: [79.255, 30.152, 10.5] // [lon, lat, depth]
      }
    };

    it('should normalize a complete GeoJSON feature into IncidentReport schema', () => {
      const retrievedAt = new Date('2026-10-23T12:00:00.000Z');
      const normalized = normalizeFeature(sampleFeature, retrievedAt);

      expect(normalized.sourceReportId).toBe('us7000eq99');
      expect(normalized.sourceName).toBe(USGS_SOURCE_NAME);
      expect(normalized.sourceType).toBe(USGS_SOURCE_TYPE);
      expect(normalized.sourceUrl).toBe('https://earthquake.usgs.gov/earthquakes/eventpage/us7000eq99');
      expect(normalized.eventType).toBe('earthquake');
      expect(normalized.title).toBe('M 6.3 - 35 km SSW of Chamoli, India');
      expect(normalized.severity).toBe('severe');
      expect(normalized.isSynthetic).toBe(false);
      expect(normalized.syntheticId).toBeUndefined();

      // Coordinates mapping: [lon, lat, depth] -> latitude, longitude
      expect(normalized.geographicInfo).toBeDefined();
      expect(normalized.geographicInfo.coordinates.latitude).toBe(30.152);
      expect(normalized.geographicInfo.coordinates.longitude).toBe(79.255);
      expect(normalized.geographicInfo.locationName).toBe('35 km SSW of Chamoli, India');

      // Unfabricated values
      expect(normalized.geographicInfo.adminRegion).toBeNull();
      expect(normalized.geographicInfo.country).toBeNull();
      expect(normalized.geographicInfo.affectedRadiusKm).toBeNull();

      // Timestamps
      expect(normalized.publishedAt).toEqual(new Date(1792750674000));
      expect(normalized.updatedAtSource).toEqual(new Date(1792751000000));
      expect(normalized.eventOccurredAt).toEqual(new Date(1792750674000));
      expect(normalized.retrievedAt).toEqual(retrievedAt);

      // Raw payload preserves depth and source metadata
      expect(normalized.rawPayload.mag).toBe(6.3);
      expect(normalized.rawPayload.depthKm).toBe(10.5);
    });

    it('should handle missing optional fields gracefully without fabricating values', () => {
      const minimalFeature = {
        type: 'Feature',
        id: 'ci4001',
        properties: {
          time: 1792750674000
          // mag, place, url, updated, title all omitted
        },
        geometry: null // no coordinates
      };

      const normalized = normalizeFeature(minimalFeature);

      expect(normalized.sourceReportId).toBe('ci4001');
      expect(normalized.severity).toBe('unknown');
      expect(normalized.sourceUrl).toBeNull();
      expect(normalized.updatedAtSource).toBeNull();
      expect(normalized.geographicInfo.coordinates).toBeNull();
      expect(normalized.geographicInfo.locationName).toBe('Unspecified region');
      expect(normalized.title).toBe('M Unknown - Unspecified region');
    });

    it('should discard out-of-bounds coordinates without throwing', () => {
      const invalidCoordsFeature = {
        type: 'Feature',
        id: 'bad-coords-1',
        properties: {
          time: 1792750674000,
          mag: 3.1
        },
        geometry: {
          type: 'Point',
          coordinates: [999.0, -185.0] // invalid lon/lat
        }
      };

      const normalized = normalizeFeature(invalidCoordsFeature);
      expect(normalized.geographicInfo.coordinates).toBeNull();
    });
  });

  describe('fetchFeed with mocked HTTP', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('should successfully parse valid GeoJSON FeatureCollection', async () => {
      const mockFeatures = [
        { type: 'Feature', id: 'mock1', properties: { time: 1000 } },
        { type: 'Feature', id: 'mock2', properties: { time: 2000 } }
      ];

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          type: 'FeatureCollection',
          features: mockFeatures
        })
      });

      const features = await fetchFeed({
        feedUrl: 'https://mock.usgs.example/test.geojson',
        timeoutMs: 1000
      });

      expect(features).toHaveLength(2);
      expect(features[0].id).toBe('mock1');
    });

    it('should respect maxRecords parameter and slice results', async () => {
      const mockFeatures = [
        { type: 'Feature', id: 'm1', properties: { time: 1 } },
        { type: 'Feature', id: 'm2', properties: { time: 2 } },
        { type: 'Feature', id: 'm3', properties: { time: 3 } }
      ];

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          type: 'FeatureCollection',
          features: mockFeatures
        })
      });

      const features = await fetchFeed({
        feedUrl: 'https://mock.usgs.example/test.geojson',
        maxRecords: 2
      });

      expect(features).toHaveLength(2);
      expect(features[1].id).toBe('m2');
    });

    it('should throw FEED_FETCH_HTTP_ERROR on non-200 responses', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      });

      await expect(
        fetchFeed({ feedUrl: 'https://mock.usgs.example/test.geojson' })
      ).rejects.toThrow(/USGS HTTP Error 503/);
    });

    it('should throw FEED_MALFORMED_PAYLOAD when response is not a FeatureCollection', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', data: [] })
      });

      await expect(
        fetchFeed({ feedUrl: 'https://mock.usgs.example/test.geojson' })
      ).rejects.toThrow(/FeatureCollection/);
    });

    it('should handle timeout and throw FEED_TIMEOUT', async () => {
      vi.spyOn(global, 'fetch').mockImplementationOnce(() => {
        const err = new Error('The operation was aborted');
        err.name = 'AbortError';
        return Promise.reject(err);
      });

      await expect(
        fetchFeed({ feedUrl: 'https://mock.usgs.example/test.geojson', timeoutMs: 100 })
      ).rejects.toThrow(/timed out/i);
    });
  });
});
