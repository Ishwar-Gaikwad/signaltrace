import { describe, it, expect } from 'vitest';
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
    expect(mapGdacsEventType('UNKNOWN')).toBe('severe_weather');
  });

  it('should validate feature id presence', () => {
    expect(validateFeature(null).valid).toBe(false);
    expect(validateFeature({}).valid).toBe(false);
    expect(validateFeature({ eventid: '123' }).valid).toBe(true);
    expect(validateFeature({ properties: { eventid: '456' } }).valid).toBe(true);
  });

  it('should normalize a GDACS flood event into IncidentReport schema', () => {
    const raw = {
      eventid: '999888',
      eventtype: 'FL',
      alertlevel: 'Red',
      name: 'Brahmaputra Basin Flood Alert',
      country: 'India',
      description: 'Dangerous flooding in river floodplains',
      fromdate: '2026-10-22T10:00:00.000Z',
      latitude: 26.15,
      longitude: 91.75,
      url: 'https://www.gdacs.org/report.aspx?eventid=999888'
    };

    const norm = normalizeFeature(raw);
    expect(norm.sourceReportId).toBe('GDACS-999888');
    expect(norm.sourceName).toContain('GDACS');
    expect(norm.eventType).toBe('flood');
    expect(norm.severity).toBe('extreme');
    expect(norm.geographicInfo.coordinates).toEqual({ latitude: 26.15, longitude: 91.75 });
    expect(norm.geographicInfo.country).toBe('India');
    expect(norm.isSynthetic).toBe(false);
    expect(typeof norm.sourceUrl).toBe('string');
  });

  it('should fetch feed items with graceful fallback handling', async () => {
    const items = await gdacsAdapter.fetchFeed({ timeoutMs: 1500 });
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
  });
});
