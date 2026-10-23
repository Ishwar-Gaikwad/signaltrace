import { describe, expect, it } from 'vitest';
import {
  computeIncidentBounds,
  filterIncidents,
  getIncidentRecords,
  getIncidentProvenance,
  getSpatialProximityMessage,
  isValidCoordinate
} from '../../client/src/utils/geoUtils.js';
import { readFileSync } from 'node:fs';

describe('map incident data helpers', () => {
  it('reads the incident array returned by the frontend API service', () => {
    const incidents = [{ _id: 'one' }];

    expect(getIncidentRecords({ incidents })).toBe(incidents);
    expect(getIncidentRecords({ data: incidents })).toEqual([]);
    expect(getIncidentRecords(null)).toEqual([]);
  });

  it('validates explicitly stored nested coordinates and rejects invalid bounds', () => {
    expect(isValidCoordinate({ latitude: 26.542, longitude: 88.719 })).toBe(true);
    expect(isValidCoordinate({ latitude: '-90', longitude: '180' })).toBe(true);
    expect(isValidCoordinate({ latitude: 91, longitude: 0 })).toBe(false);
    expect(isValidCoordinate({ latitude: 0, longitude: -181 })).toBe(false);
    expect(isValidCoordinate(null)).toBe(false);

    const nestedIncident = { geographicInfo: { coordinates: { latitude: 26.542, longitude: 88.719 } } };
    expect(isValidCoordinate(nestedIncident.geographicInfo.coordinates)).toBe(true);
    expect(computeIncidentBounds([nestedIncident])).toEqual([[26.042, 88.219], [27.042, 89.219]]);
  });

  it('handles empty datasets and filter combinations with no matches', () => {
    expect(getIncidentRecords({ incidents: [] })).toEqual([]);
    expect(computeIncidentBounds([])).toBeNull();
    expect(filterIncidents([], { provenance: 'live' })).toEqual([]);

    const incidents = [
      { eventType: 'flood', severity: 'severe', isSynthetic: true },
      { eventType: 'earthquake', severity: 'moderate', isSynthetic: false },
      { eventType: 'storm', severity: 'minor' }
    ];

    expect(filterIncidents(incidents, { eventType: 'cyclone' })).toEqual([]);
    expect(filterIncidents(incidents, { provenance: 'synthetic' })).toEqual([incidents[0]]);
    expect(filterIncidents(incidents, { provenance: 'live' })).toEqual([incidents[1]]);
    expect(filterIncidents(incidents, { eventType: 'flood', severity: 'minor' })).toEqual([]);
  });

  it('labels proximity from backend provenance and never describes distance as verification', () => {
    const synthetic = { isSynthetic: true, sourceName: 'Central Water Commission (Synthetic)' };
    const live = { isSynthetic: false, sourceName: 'Live Feed' };
    const unknown = { sourceName: 'Unknown Source' };

    expect(getIncidentProvenance(synthetic)).toBe('synthetic');
    expect(getSpatialProximityMessage(synthetic, 0)).toMatchObject({
      provenanceLabel: 'DEMO / SYNTHETIC',
      message: expect.stringContaining('not live confirmation')
    });
    expect(getSpatialProximityMessage(synthetic, 0).message).toContain('spatial proximity only');
    expect(getSpatialProximityMessage(live, 4).provenanceLabel).toBe('LIVE SOURCE RECORD');
    expect(getSpatialProximityMessage(live, 4).message).toContain('does not verify the claim details');
    expect(getSpatialProximityMessage(unknown, 2).provenanceLabel).toBe('PROVENANCE UNKNOWN');
    expect(getIncidentProvenance(unknown)).toBe('unknown');
  });

  it('keeps popup surfaces and controls explicitly high-contrast and opaque', () => {
    const css = readFileSync(new URL('../../client/src/styles/index.css', import.meta.url), 'utf8');
    expect(css).toMatch(/\.signaltrace-custom-popup \.leaflet-popup-content-wrapper[\s\S]*?background:\s*#ffffff\s*!important/);
    expect(css).toMatch(/\.signaltrace-custom-popup \.leaflet-popup-content-wrapper,[\s\S]*?color:\s*#172033\s*!important/);
    expect(css).toMatch(/\.signaltrace-custom-popup \.leaflet-popup-content-wrapper,[\s\S]*?opacity:\s*1\s*!important/);
    expect(css).toMatch(/\.signaltrace-custom-popup a\.leaflet-popup-close-button,[\s\S]*?color:\s*#334155\s*!important/);
    expect(css).toMatch(/\.signaltrace-custom-popup \.leaflet-popup-content a[\s\S]*?color:\s*#075985\s*!important/);
    expect(css).toMatch(/\.signaltrace-custom-popup a\.leaflet-popup-close-button:hover,[\s\S]*?outline:\s*2px solid #0369a1/);
  });
});
