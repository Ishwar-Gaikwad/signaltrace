/**
 * SignalTrace — Interactive Geographic Intelligence Map
 *
 * Visualizes emergency incident reports with explicit, verified geographic coordinates.
 * Features:
 * - Real-time CartoDB Dark Matter / OSM Leaflet map.
 * - Strict coordinate validation: records with missing/invalid coordinates are never mapped.
 * - Explicit visual and textual distinction between Live Authoritative Feeds and Synthetic Benchmarks.
 * - Supported filters: Provenance, Event Category, Severity, and Time Window.
 * - Synchronized incident navigation panel with click-to-fly interaction.
 * - Tile fallback / error handling for offline environments.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Globe,
  RefreshCw,
  Maximize2,
  AlertTriangle,
  ExternalLink,
  Info,
  X
} from 'lucide-react';
import { fetchIncidents } from '../services/api';
import {
  isValidCoordinate,
  formatCoordinates,
  computeIncidentBounds,
  getSeverityConfig
} from '../utils/geoUtils';

// Helper component to programmatically control Leaflet map viewport
const MapController = ({ bounds, targetPoint, shouldFitBounds }) => {
  const map = useMap();

  useEffect(() => {
    if (targetPoint) {
      map.flyTo([targetPoint.lat, targetPoint.lng], 9, { duration: 1.2 });
    }
  }, [map, targetPoint]);

  useEffect(() => {
    if (shouldFitBounds && bounds) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
    }
  }, [map, bounds, shouldFitBounds]);

  return null;
};

// Create custom SVG/HTML divIcon avoiding broken PNG assets in Vite
const createIncidentMarkerIcon = (incident, isSelected) => {
  const isLive = !incident.isSynthetic;
  const sev = getSeverityConfig(incident.severity);

  const glyphMap = {
    earthquake: '⚡',
    flood: '🌊',
    cyclone: '🌀',
    wildfire: '🔥',
    landslide: '⛰️',
    tsunami: '🌊',
    storm: '⛈️'
  };
  const glyph = glyphMap[incident.eventType?.toLowerCase()] || '📍';

  const badgeText = isLive ? 'LIVE' : 'DEMO';
  const badgeClass = isLive ? 'pin-live' : 'pin-demo';
  const selectedClass = isSelected ? 'pin-selected' : '';

  const html = `
    <div class="custom-incident-marker ${badgeClass} ${selectedClass}" style="--marker-color: ${sev.ringColor};">
      <span class="marker-badge">${badgeText}</span>
      <div class="marker-body" style="background: ${sev.bg}; border-color: ${sev.ringColor};">
        <span class="marker-glyph">${glyph}</span>
      </div>
      <div class="marker-tail" style="border-top-color: ${sev.ringColor};"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-marker-wrapper',
    iconSize: [34, 46],
    iconAnchor: [17, 46],
    popupAnchor: [0, -46]
  });
};

export const GeographicIntelligenceMap = () => {
  const [incidents, setIncidents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tilesOffline, setTilesOffline] = useState(false);
  const [referenceTime, setReferenceTime] = useState(() => Date.now());

  // Filters
  const [provenanceFilter, setProvenanceFilter] = useState('all'); // all | live | synthetic
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all'); // all | 24h | 7d | 30d

  // Selection & Map Navigation
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [targetPoint, setTargetPoint] = useState(null);
  const [fitTrigger, setFitTrigger] = useState(0);

  // Load incidents from API
  const loadIncidents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Request up to 100 incident records
      const res = await fetchIncidents({ limit: 100 });
      setIncidents(res.data || []);
      setReferenceTime(Date.now());
    } catch (err) {
      setError(err.message || 'Failed to load incident reports for map.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  // Filtered dataset
  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      // Provenance filter
      if (provenanceFilter === 'live' && incident.isSynthetic) return false;
      if (provenanceFilter === 'synthetic' && !incident.isSynthetic) return false;

      // Event type filter
      if (eventTypeFilter !== 'all' && incident.eventType?.toLowerCase() !== eventTypeFilter.toLowerCase()) {
        return false;
      }

      // Severity filter
      if (severityFilter !== 'all' && incident.severity?.toLowerCase() !== severityFilter.toLowerCase()) {
        return false;
      }

      // Time window filter on publishedAt or eventOccurredAt
      if (timeFilter !== 'all') {
        const timeVal = incident.publishedAt || incident.eventOccurredAt || incident.createdAt;
        if (!timeVal) return false;
        const incidentDate = new Date(timeVal).getTime();
        const diffMs = referenceTime - incidentDate;

        if (timeFilter === '24h' && diffMs > 24 * 60 * 60 * 1000) return false;
        if (timeFilter === '7d' && diffMs > 7 * 24 * 60 * 60 * 1000) return false;
        if (timeFilter === '30d' && diffMs > 30 * 24 * 60 * 60 * 1000) return false;
      }

      return true;
    });
  }, [incidents, provenanceFilter, eventTypeFilter, severityFilter, timeFilter, referenceTime]);

  // Subset with valid coordinates (safe for mapping)
  const mappedIncidents = useMemo(() => {
    return filteredIncidents.filter((inc) => isValidCoordinate(inc?.geographicInfo?.coordinates));
  }, [filteredIncidents]);

  // Subset without coordinates
  const unmappedIncidents = useMemo(() => {
    return filteredIncidents.filter((inc) => !isValidCoordinate(inc?.geographicInfo?.coordinates));
  }, [filteredIncidents]);

  // Compute bounding box
  const mapBounds = useMemo(() => {
    return computeIncidentBounds(mappedIncidents);
  }, [mappedIncidents]);

  const handleSelectIncident = (incident) => {
    setSelectedIncidentId(incident._id);
    if (isValidCoordinate(incident?.geographicInfo?.coordinates)) {
      setTargetPoint({
        lat: Number(incident.geographicInfo.coordinates.latitude),
        lng: Number(incident.geographicInfo.coordinates.longitude)
      });
    }
  };

  const handleFitBounds = () => {
    setFitTrigger((prev) => prev + 1);
  };

  const handleResetFilters = () => {
    setProvenanceFilter('all');
    setEventTypeFilter('all');
    setSeverityFilter('all');
    setTimeFilter('all');
    setSelectedIncidentId(null);
  };

  return (
    <div className="card" style={{ marginTop: '2rem' }}>
      {/* Header & Truthful Provenance Banner */}
      <div className="card-header" style={{ alignItems: 'flex-start' }}>
        <div className="card-title-group">
          <div className="card-icon" style={{ background: 'rgba(56, 189, 248, 0.1)' }}>
            <Globe size={22} style={{ color: 'var(--accent-cyan)' }} />
          </div>
          <div>
            <h2 className="card-title">Geographic Intelligence Map</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Map view of reported emergency incidents with verified location coordinates
            </p>
          </div>
        </div>

        {/* Quick Refresh */}
        <button
          type="button"
          className="btn btn-outline"
          onClick={loadIncidents}
          disabled={isLoading}
          style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
          title="Refresh incident reports from server"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Verification Separation Notice */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.65rem',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(56, 189, 248, 0.04)',
          border: '1px solid rgba(56, 189, 248, 0.15)',
          fontSize: '0.78rem',
          color: 'var(--text-secondary)',
          marginBottom: '1.25rem'
        }}
      >
        <Info size={16} style={{ color: 'var(--accent-cyan)', flexShrink: 0, marginTop: '2px' }} />
        <span>
          <strong>Geographic Intelligence Notice:</strong> Markers represent reported locations from official bulletins and demonstration scenarios.
          A marker indicates where an incident was officially reported, <em>not verification of unverified claims</em>. Coordinates are plotted only when explicitly provided by the source.
        </span>
      </div>

      {/* Filter Control Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          padding: '0.75rem 1rem',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.25rem'
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.6rem' }}>
          {/* Provenance Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Provenance:</span>
            <select
              value={provenanceFilter}
              onChange={(e) => setProvenanceFilter(e.target.value)}
              style={{
                background: '#090e1b',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                outline: 'none'
              }}
            >
              <option value="all">All Sources</option>
              <option value="live">Live Official Feeds</option>
              <option value="synthetic">Example Scenarios</option>
            </select>
          </div>

          {/* Event Category Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hazard:</span>
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              style={{
                background: '#090e1b',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                outline: 'none'
              }}
            >
              <option value="all">All Hazards</option>
              <option value="earthquake">Earthquake</option>
              <option value="flood">Flood</option>
              <option value="cyclone">Cyclone</option>
              <option value="wildfire">Wildfire</option>
              <option value="landslide">Landslide</option>
              <option value="storm">Severe Storm</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              style={{
                background: '#090e1b',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                outline: 'none'
              }}
            >
              <option value="all">All Severities</option>
              <option value="extreme">Extreme</option>
              <option value="severe">Severe</option>
              <option value="moderate">Moderate</option>
              <option value="minor">Minor</option>
            </select>
          </div>

          {/* Time Window Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Window:</span>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              style={{
                background: '#090e1b',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                outline: 'none'
              }}
            >
              <option value="all">All Available</option>
              <option value="24h">Past 24 Hours</option>
              <option value="7d">Past 7 Days</option>
              <option value="30d">Past 30 Days</option>
            </select>
          </div>
        </div>

        {/* Actions & Map Statistics */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <strong>{mappedIncidents.length}</strong> mapped
            {unmappedIncidents.length > 0 && ` (${unmappedIncidents.length} unmapped)`}
          </span>

          {mapBounds && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleFitBounds}
              style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem' }}
              title="Fit map viewport to all currently visible incidents"
            >
              <Maximize2 size={12} />
              <span>Fit View</span>
            </button>
          )}

          {(provenanceFilter !== 'all' || eventTypeFilter !== 'all' || severityFilter !== 'all' || timeFilter !== 'all') && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleResetFilters}
              style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem' }}
              title="Reset all active filters"
            >
              <X size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Tiles Offline Banner */}
      {tilesOffline && (
        <div
          style={{
            padding: '0.55rem 0.85rem',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: 'var(--accent-amber)',
            fontSize: '0.78rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <AlertTriangle size={15} />
          <span>External map tiles unavailable (offline / network restricted). Incident markers and coordinates remain active.</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="alert-error" style={{ marginBottom: '1rem' }}>
          <AlertTriangle size={18} />
          <div>{error}</div>
        </div>
      )}

      {/* Interactive Map & Synchronized List Layout */}
      <div className="geo-map-split-container">
        {/* Left Column: Map Canvas */}
        <div className="geo-map-wrapper">
          {isLoading ? (
            <div className="geo-map-placeholder">
              <RefreshCw size={24} className="animate-spin" style={{ color: 'var(--accent-cyan)' }} />
              <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Loading geographic intelligence coordinates...
              </p>
            </div>
          ) : (
            <MapContainer
              center={[22.5, 82.5]}
              zoom={4}
              scrollWheelZoom={false}
              style={{ width: '100%', height: '100%', minHeight: '440px', background: '#070a13' }}
            >
              {/* CartoDB Dark Matter Basemap with OpenStreetMap attribution */}
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                maxZoom={19}
                eventHandlers={{
                  tileerror: () => setTilesOffline(true),
                  tileload: () => setTilesOffline(false)
                }}
              />

              {/* Viewport controller */}
              <MapController
                bounds={mapBounds}
                targetPoint={targetPoint}
                shouldFitBounds={fitTrigger > 0 || (mappedIncidents.length > 0 && !targetPoint)}
              />

              {/* Incident Markers */}
              {mappedIncidents.map((incident) => {
                const lat = Number(incident.geographicInfo.coordinates.latitude);
                const lng = Number(incident.geographicInfo.coordinates.longitude);
                const isSelected = incident._id === selectedIncidentId;
                const isLive = !incident.isSynthetic;
                const sevConfig = getSeverityConfig(incident.severity);
                const radiusKm = incident.geographicInfo.affectedRadiusKm;

                return (
                  <React.Fragment key={incident._id}>
                    {/* Optional Affected Radius Area (if explicitly documented in record, e.g. CWC or USGS bulletin) */}
                    {radiusKm && radiusKm > 0 && radiusKm <= 200 && (
                      <Circle
                        center={[lat, lng]}
                        radius={radiusKm * 1000}
                        pathOptions={{
                          color: sevConfig.ringColor,
                          fillColor: sevConfig.ringColor,
                          fillOpacity: 0.08,
                          weight: 1,
                          dashArray: '4, 4'
                        }}
                      />
                    )}

                    <Marker
                      position={[lat, lng]}
                      icon={createIncidentMarkerIcon(incident, isSelected)}
                      eventHandlers={{
                        click: () => {
                          setSelectedIncidentId(incident._id);
                        }
                      }}
                    >
                      <Popup className="signaltrace-custom-popup">
                        <div style={{ padding: '0.4rem', maxWidth: '280px', color: '#f1f5f9' }}>
                          {/* Provenance Pill */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                            <span
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                                background: isLive ? 'rgba(56, 189, 248, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                                color: isLive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                                border: `1px solid ${isLive ? 'rgba(56, 189, 248, 0.4)' : 'var(--border-subtle)'}`
                              }}
                            >
                              {isLive ? 'LIVE OFFICIAL FEED' : 'DEMONSTRATION SCENARIO'}
                            </span>
                            <span
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                                background: sevConfig.bg,
                                color: sevConfig.color,
                                border: `1px solid ${sevConfig.border}`
                              }}
                            >
                              {sevConfig.label}
                            </span>
                          </div>

                          {/* Title */}
                          <h4 style={{ fontSize: '0.88rem', fontWeight: 600, color: '#ffffff', lineHeight: 1.35, marginBottom: '0.35rem' }}>
                            {incident.title}
                          </h4>

                          {/* Location & Coordinates */}
                          <p style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.25rem' }}>
                            <MapPin size={12} style={{ color: 'var(--accent-cyan)' }} />
                            <span>{incident.geographicInfo?.locationName || 'Location documented'}</span>
                          </p>
                          <p style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'var(--font-mono)', marginBottom: '0.5rem' }}>
                            {formatCoordinates(incident.geographicInfo?.coordinates)}
                            {radiusKm ? ` · Radius: ${radiusKm}km` : ''}
                          </p>

                          {/* Description excerpt */}
                          <p style={{ fontSize: '0.76rem', color: '#cbd5e1', lineHeight: 1.45, marginBottom: '0.5rem' }}>
                            {incident.description?.length > 140
                              ? `${incident.description.slice(0, 140)}...`
                              : incident.description}
                          </p>

                          {/* Timestamps */}
                          <div style={{ fontSize: '0.7rem', color: '#64748b', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.4rem', marginBottom: '0.4rem' }}>
                            {incident.eventOccurredAt && (
                              <div>Occurred: {new Date(incident.eventOccurredAt).toUTCString()}</div>
                            )}
                            <div>Published: {incident.publishedAt ? new Date(incident.publishedAt).toUTCString() : 'Timestamp not provided'}</div>
                          </div>

                          {/* Source Link */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                            <span style={{ color: '#94a3b8' }}>{incident.sourceName}</span>
                            {incident.sourceUrl && (
                              <a
                                href={incident.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: 'var(--accent-cyan)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                              >
                                <span>Report</span>
                                <ExternalLink size={10} />
                              </a>
                            )}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  </React.Fragment>
                );
              })}
            </MapContainer>
          )}

          {/* Empty State Overlay */}
          {!isLoading && mappedIncidents.length === 0 && (
            <div className="geo-map-empty-overlay">
              <AlertTriangle size={20} style={{ color: 'var(--accent-amber)' }} />
              <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.35rem' }}>
                No Mapped Incidents Available
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '280px', marginTop: '0.25rem' }}>
                No records match your active filters or contain explicit geographic coordinates. Coordinates are never fabricated.
              </p>
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleResetFilters}
                style={{ marginTop: '0.65rem', padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Synchronized Incident Registry */}
        <div className="geo-incident-registry">
          <div className="geo-registry-header">
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Incident Feed ({filteredIncidents.length})
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Click to locate on map
            </span>
          </div>

          <div className="geo-registry-list">
            {filteredIncidents.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                No incident reports found matching current filters.
              </div>
            ) : (
              filteredIncidents.map((incident) => {
                const hasCoords = isValidCoordinate(incident.geographicInfo?.coordinates);
                const isSelected = incident._id === selectedIncidentId;
                const isLive = !incident.isSynthetic;
                const sevConfig = getSeverityConfig(incident.severity);

                return (
                  <div
                    key={incident._id}
                    className={`geo-incident-card ${isSelected ? 'active' : ''}`}
                    onClick={() => handleSelectIncident(incident)}
                    style={{
                      cursor: 'pointer',
                      borderLeft: isSelected ? '3px solid var(--accent-cyan)' : '3px solid transparent'
                    }}
                  >
                    {/* Top Row: Provenance & Severity */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '0.12rem 0.4rem',
                          borderRadius: '3px',
                          background: isLive ? 'rgba(56, 189, 248, 0.12)' : 'rgba(148, 163, 184, 0.12)',
                          color: isLive ? 'var(--accent-cyan)' : 'var(--text-secondary)'
                        }}
                      >
                        {isLive ? 'LIVE FEED' : 'DEMO'}
                      </span>

                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          color: sevConfig.color
                        }}
                      >
                        {sevConfig.label}
                      </span>
                    </div>

                    {/* Title */}
                    <h4 style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.35, marginBottom: '0.25rem' }}>
                      {incident.title}
                    </h4>

                    {/* Location & Coordinate Indicator */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.35rem' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <MapPin size={11} style={{ color: hasCoords ? 'var(--accent-cyan)' : 'var(--text-muted)' }} />
                        <span>{incident.geographicInfo?.locationName || 'Location recorded'}</span>
                      </span>

                      {hasCoords ? (
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.68rem',
                            color: 'var(--accent-emerald)',
                            background: 'rgba(52, 211, 153, 0.08)',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '3px'
                          }}
                        >
                          {formatCoordinates(incident.geographicInfo.coordinates)}
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '0.68rem',
                            color: 'var(--text-muted)',
                            background: 'rgba(255, 255, 255, 0.03)',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '3px'
                          }}
                        >
                          No coordinates stored
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeographicIntelligenceMap;
