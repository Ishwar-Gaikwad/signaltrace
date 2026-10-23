import { describe, it, expect, vi } from 'vitest';
import {
  gdacsAdapter,
  mapGdacsSeverity,
  mapGdacsEventType,
  validateFeature,
  normalizeFeature
} from '../src/services/ingestion/adapters/gdacsAdapter.js';

describe('GDACS Multi-Hazard Disaster Feed Adapter', () => {
  it('should map GDACS alert levels to standard severity enum', () => {
    expect(mapGdacsSeverity('Red')).toBe('extreme');
    expect(mapGdacsSeverity('Orange')).toBe('severe');
    expect(mapGdacsSeverity('Green')).toBe('moderate');
    expect(mapGdacsSeverity('Yellow')).toBe('moderate');
    expect(mapGdacsSeverity(null)).toBe('moderate');
  });

  it('should map GDACS event type codes to schema eventType', () => {
    expect(mapGdacsEventType('FL')).toBe('flood');
    expect(mapGdacsEventType('TC')).toBe('cyclone');
    expect(mapGdacsEventType('EQ')).toBe('earthquake');
    expect(mapGdacsEventType('WF')).toBe('wildfire');
    expect(mapGdacsEventType('LS')).toBe('landslide');
    expect(mapGdacsEventType('UNKNOWN')).toBe('other');
  });

  it('should validate feature id presence', () => {
    expect(validateFeature(null).valid).toBe(false);
    expect(validateFeature({}).valid).toBe(false);
    expect(validateFeature({ eventid: '123' }).valid).toBe(true);
    expect(validateFeature({ properties: { eventid: '456' } }).valid).toBe(true);
  });

  it('normalizes real source-shaped GDACS properties without inventing timestamps or URLs', () => {
    const raw = {
      type: 'Feature',
      properties: {
        eventid: '999888', eventtype: 'FL', alertlevel: 'Red',
        name: 'Brahmaputra Basin Flood Alert', country: 'India',
        description: 'Dangerous flooding in river floodplains',
        fromdate: '2026-10-22T10:00:00.000Z'
      },
      geometry: { type: 'Point', coordinates: [91.75, 26.15] }
    };

    const norm = normalizeFeature(raw);
    expect(norm.sourceReportId).toBe('GDACS-999888');
    expect(norm.sourceName).toContain('GDACS');
    expect(norm.eventType).toBe('flood');
    expect(norm.severity).toBe('extreme');
    expect(norm.geographicInfo.coordinates).toEqual({ latitude: 26.15, longitude: 91.75 });
    expect(norm.geographicInfo.country).toBe('India');
    expect(norm.isSynthetic).toBe(false);
    expect(norm.sourceUrl).toBeNull();
    expect(norm.publishedAt).toBeNull();
    expect(norm.eventOccurredAt).toEqual(new Date('2026-10-22T10:00:00.000Z'));
    expect(norm.isSynthetic).toBe(false);
  });

  it('returns real feed features and does not disguise offline fixtures as GDACS', async () => {
    const feature = { type: 'Feature', properties: { eventid: '123' }, geometry: null };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ features: [feature] }) });
    try {
      await expect(gdacsAdapter.fetchFeed({ feedUrl: 'https://feed.example.test', timeoutMs: 1500 })).resolves.toEqual([feature]);
      fetchMock.mockRejectedValueOnce(new Error('network offline'));
      await expect(gdacsAdapter.fetchFeed({ feedUrl: 'https://feed.example.test', timeoutMs: 1500 })).rejects.toThrow(/GDACS feed unavailable/);
    } finally {
      fetchMock.mockRestore();
    }
  });
});
