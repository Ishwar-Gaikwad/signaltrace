/**
 * SignalTrace — Incident Source Panel
 *
 * Displays stored incident reports from the database via GET /api/incidents.
 * Provides live vs synthetic source filtering, event type filtering,
 * geographic coordinates inspection (Phase 7 map preparation),
 * and transparent provenance disclosure without fabricated records.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  Globe,
  RefreshCw,
  ExternalLink,
  MapPin,
  Clock,
  Filter,
  AlertTriangle,
  Info
} from 'lucide-react';
import { fetchIncidents } from '../services/api';

const PROVENANCE_OPTIONS = [
  { key: 'all', label: 'All Sources' },
  { key: 'live', label: 'Live Feeds (USGS)', isSynthetic: false },
  { key: 'synthetic', label: 'Example Scenarios', isSynthetic: true }
];

const EVENT_TYPE_OPTIONS = [
  'all',
  'earthquake',
  'flood',
  'wildfire',
  'cyclone',
  'landslide',
  'tsunami',
  'industrial_hazard',
  'storm',
  'other'
];

export const IncidentSourcePanel = () => {
  const [incidents, setIncidents] = useState([]);
  const [meta, setMeta] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProvenance, setSelectedProvenance] = useState('all');
  const [selectedEventType, setSelectedEventType] = useState('all');

  const loadIncidents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const isSyntheticParam =
        selectedProvenance === 'live'
          ? false
          : selectedProvenance === 'synthetic'
          ? true
          : null;

      const eventTypeParam = selectedEventType === 'all' ? null : selectedEventType;

      const response = await fetchIncidents({
        page: 1,
        limit: 8,
        isSynthetic: isSyntheticParam,
        eventType: eventTypeParam
      });

      setIncidents(response.incidents || []);
      setMeta(response.meta || {});
    } catch (err) {
      setError(err.message || 'Failed to load incident reports');
    } finally {
      setIsLoading(false);
    }
  }, [selectedProvenance, selectedEventType]);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  const formatTimestamp = (dateString) => {
    if (!dateString) return 'Date unspecified';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid timestamp';
    }
  };

  const getSeverityBadgeClass = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'extreme':
        return 'status-tag conflicting';
      case 'severe':
        return 'status-tag outdated';
      case 'moderate':
        return 'status-tag verified';
      case 'minor':
      default:
        return 'status-tag unverified';
    }
  };

  return (
    <section className="card" style={{ marginTop: '2.5rem' }}>
      {/* Header */}
      <div className="card-header">
        <div className="card-title-group">
          <div className="card-icon" style={{ background: 'rgba(56, 189, 248, 0.1)' }}>
            <ShieldAlert size={20} />
          </div>
          <div>
            <h2 className="card-title">Official Reports & Alerts</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Official emergency bulletins, geological alerts, and reference records used to verify statements
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="hackathon-badge" style={{ borderColor: 'rgba(56, 189, 248, 0.3)' }}>
            {meta.totalRecords !== undefined ? `${meta.totalRecords} Records Available` : 'Loading...'}
          </span>
          <button
            type="button"
            className="btn btn-outline"
            onClick={loadIncidents}
            disabled={isLoading}
            aria-label="Refresh incidents"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.85rem 1rem',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(0,0,0,0.15)'
        }}
      >
        {/* Source Provenance Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Filter size={12} /> Source:
          </span>
          {PROVENANCE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSelectedProvenance(opt.key)}
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-full)',
                border: selectedProvenance === opt.key ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                background: selectedProvenance === opt.key ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                color: selectedProvenance === opt.key ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Event Type Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Event Type:</span>
          <select
            value={selectedEventType}
            onChange={(e) => setSelectedEventType(e.target.value)}
            style={{
              background: '#090e1b',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              outline: 'none',
              textTransform: 'capitalize'
            }}
          >
            {EVENT_TYPE_OPTIONS.map((et) => (
              <option key={et} value={et}>
                {et === 'all' ? 'All Event Types' : et}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid of Incidents */}
      <div style={{ padding: '1rem' }}>
        {/* Loading State */}
        {isLoading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.85rem' }}>
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ height: '14px', width: '50%', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', marginBottom: '0.75rem' }} />
                <div style={{ height: '12px', width: '85%', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', marginBottom: '0.5rem' }} />
                <div style={{ height: '10px', width: '35%', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }} />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div
            style={{
              padding: '1.5rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(244, 63, 94, 0.08)',
              border: '1px solid rgba(244, 63, 94, 0.25)',
              color: 'var(--status-disconnected-text)',
              fontSize: '0.85rem',
              textAlign: 'center'
            }}
          >
            <AlertTriangle size={20} style={{ margin: '0 auto 0.5rem', display: 'block' }} />
            <p style={{ marginBottom: '0.5rem' }}>{error}</p>
            <button
              type="button"
              className="btn btn-outline"
              onClick={loadIncidents}
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
            >
              Retry Loading Incidents
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && incidents.length === 0 && (
          <div
            style={{
              padding: '3rem 1rem',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.85rem'
            }}
          >
            <Globe size={32} style={{ opacity: 0.35, margin: '0 auto 0.75rem', display: 'block' }} />
            <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
              No incident reports found
            </p>
            <p style={{ marginTop: '0.3rem', fontSize: '0.78rem' }}>
              No stored records match the selected source and event type filters.
            </p>
          </div>
        )}

        {/* Incidents Grid */}
        {!isLoading && !error && incidents.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.85rem' }}>
            {incidents.map((incident) => {
              const coords = incident.geographicInfo?.coordinates;
              const hasCoordinates = coords?.latitude != null && coords?.longitude != null;

              return (
                <div
                  key={incident._id}
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    {/* Badges row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        {/* Provenance Tag */}
                        {incident.isSynthetic ? (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              padding: '0.12rem 0.4rem',
                              borderRadius: '4px',
                              background: 'rgba(255, 255, 255, 0.06)',
                              color: 'var(--text-muted)',
                              border: '1px solid var(--border-subtle)',
                              letterSpacing: '0.04em'
                            }}
                          >
                            DEMO RECORD
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              padding: '0.12rem 0.4rem',
                              borderRadius: '4px',
                              background: 'rgba(56, 189, 248, 0.12)',
                              color: 'var(--accent-cyan)',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
                              letterSpacing: '0.04em'
                            }}
                          >
                            LIVE FEED
                          </span>
                        )}

                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            padding: '0.12rem 0.4rem',
                            borderRadius: '4px',
                            background: 'rgba(255, 255, 255, 0.04)',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          {incident.eventType}
                        </span>
                      </div>

                      {incident.severity && (
                        <span className={getSeverityBadgeClass(incident.severity)} style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                          {incident.severity.toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3
                      style={{
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        marginBottom: '0.4rem',
                        lineHeight: 1.35
                      }}
                    >
                      {incident.title}
                    </h3>

                    {/* Description Excerpt */}
                    <p
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.45,
                        marginBottom: '0.65rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {incident.description}
                    </p>
                  </div>

                  {/* Metadata and Geographic Coordinates Footer */}
                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.55rem', marginTop: '0.4rem' }}>
                    {/* Source Name & URL */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                      <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
                        {incident.sourceName}
                      </span>
                      {incident.sourceUrl && (
                        <a
                          href={incident.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--accent-cyan)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                        >
                          Source <ExternalLink size={10} />
                        </a>
                      )}
                    </div>

                    {/* Timestamps & Geography */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={11} /> {formatTimestamp(incident.publishedAt || incident.eventOccurredAt)}
                      </span>

                      {/* Phase 7 Map Preparation: Real Geocoding Coordinates boundary */}
                      {hasCoordinates ? (
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            color: 'var(--accent-emerald)',
                            background: 'rgba(16, 185, 129, 0.08)',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '4px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.68rem'
                          }}
                          title={`Coordinates: Lat ${coords.latitude}, Lon ${coords.longitude}`}
                        >
                          <MapPin size={10} />
                          {coords.latitude.toFixed(2)}°, {coords.longitude.toFixed(2)}°
                        </span>
                      ) : incident.geographicInfo?.locationName ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)' }}>
                          <MapPin size={10} />
                          {incident.geographicInfo.locationName.slice(0, 20)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Truthful Intelligence Disclaimer */}
        <div
          style={{
            marginTop: '1.25rem',
            padding: '0.65rem 0.85rem',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(255, 255, 255, 0.015)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.72rem',
            color: 'var(--text-muted)'
          }}
        >
          <Info size={14} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
          <span>
            <strong>Official Records Notice:</strong> Verified emergency bulletins and example scenarios stored in SignalTrace are used to cross-reference statements.
            This repository indexes verified agency bulletins and does not claim comprehensive coverage of all global crisis events.
          </span>
        </div>
      </div>
    </section>
  );
};

export default IncidentSourcePanel;
