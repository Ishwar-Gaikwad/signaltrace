import React, { useState, useEffect } from 'react';
import {
  Server,
  Database,
  AlertTriangle,
  RefreshCw,
  Clock,
  Layers,
  Info,
  ChevronDown,
  ChevronUp,
  Globe,
  Radio,
  Activity,
  FileCheck
} from 'lucide-react';
import ClaimExtractionCard from '../components/ClaimExtractionCard';
import RecentClaimsPanel from '../components/RecentClaimsPanel';
import IncidentSourcePanel from '../components/IncidentSourcePanel';
import GeographicIntelligenceMap from '../components/GeographicIntelligenceMap';
import CitizenBotSimulator from '../components/CitizenBotSimulator';
import { fetchIncidents } from '../services/api';

/**
 * DashboardShell Component
 * Phase 6: Emergency Intelligence Dashboard
 */
export const DashboardShell = ({ healthState }) => {
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [selectedClaimId, setSelectedClaimId] = useState(null);
  const [activeClaim, setActiveClaim] = useState(null);
  const [claimsRefreshTrigger, setClaimsRefreshTrigger] = useState(0);
  const [liveIncidentStats, setLiveIncidentStats] = useState({
    checked: false,
    count: 0,
    latestTime: null,
    error: null
  });

  const {
    data,
    raw,
    error,
    latencyMs,
    endpoint,
    checkHealth,
    isChecking,
    isConnected,
    isDisconnected
  } = healthState;

  // Check live source data presence honestly from MongoDB
  const checkLiveStats = async () => {
    try {
      const res = await fetchIncidents({ isSynthetic: 'false', limit: 1 });
      const totalLive = res.meta?.totalRecords || 0;
      const latest = res.incidents?.[0];
      setLiveIncidentStats({
        checked: true,
        count: totalLive,
        latestTime: latest ? (latest.publishedAt || latest.createdAt) : null,
        error: null
      });
    } catch (err) {
      setLiveIncidentStats({
        checked: true,
        count: 0,
        latestTime: null,
        error: err.message
      });
    }
  };

  useEffect(() => {
    if (isConnected) {
      checkLiveStats();
    }
  }, [isConnected]);

  const handleClaimSubmitted = (claim) => {
    if (claim) setActiveClaim(claim);
    // Increment trigger so RecentClaimsPanel re-fetches
    setClaimsRefreshTrigger((prev) => prev + 1);
  };

  const handleSelectClaim = (id, claim = null) => {
    setSelectedClaimId(id);
    if (claim) setActiveClaim(claim);
    // Smooth scroll to top of workspace if needed
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  return (
    <div className="main-content">
      {/* Backend Offline Banner */}
      {isDisconnected && (
        <div className="alert-error" role="alert" style={{ marginBottom: '1.25rem' }}>
          <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Unable to connect to service:</strong> {error}
            <div style={{ marginTop: '0.35rem', fontSize: '0.8rem', opacity: 0.9 }}>
              The SignalTrace verification engine appears to be offline. Please verify that the system service is active.
            </div>
          </div>
        </div>
      )}

      {/* System Status Bar */}
      <section className="dashboard-header-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                display: 'inline-block',
                width: '9px',
                height: '9px',
                borderRadius: '50%',
                background: isConnected ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                boxShadow: isConnected ? '0 0 8px rgba(52, 211, 153, 0.6)' : 'none'
              }}
            />
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              System Status: {isConnected ? 'Operational' : 'Degraded'}
            </span>
          </div>

          <span style={{ color: 'var(--border-subtle)' }}>|</span>

          {/* Live Feed Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            <Globe size={13} style={{ color: liveIncidentStats.count > 0 ? 'var(--accent-cyan)' : 'var(--text-muted)' }} />
            <span>
              Live Feed:{' '}
              {liveIncidentStats.count > 0 ? (
                <strong style={{ color: 'var(--accent-cyan)' }}>
                  Active ({liveIncidentStats.count} live reports)
                </strong>
              ) : isConnected ? (
                <span style={{ color: 'var(--accent-amber)' }}>
                  Standby (Ready to sync)
                </span>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>Unavailable</span>
              )}
            </span>
          </div>

          <span style={{ color: 'var(--border-subtle)' }}>|</span>

          {/* Example Scenarios */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            <Radio size={13} style={{ color: 'var(--accent-emerald)' }} />
            <span>Example Scenarios: <strong>7 Ready</strong></span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            style={{ padding: '0.28rem 0.65rem', fontSize: '0.75rem' }}
          >
            <Activity size={12} />
            <span>{showDiagnostics ? 'Hide System Details' : 'System Details'}</span>
            {showDiagnostics ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </section>

      {/* Collapsible System Details Panel */}
      {showDiagnostics && (
        <div className="grid-2col" style={{ marginBottom: '1.5rem' }}>
          {/* Card 1: System Details */}
          <div className="card">
            <div className="card-header">
              <div className="card-title-group">
                <div className="card-icon">
                  <Layers size={18} />
                </div>
                <h3 className="card-title" style={{ fontSize: '0.95rem' }}>System Details</h3>
              </div>
            </div>

            <div className="metrics-list">
              <div className="metric-item">
                <span className="metric-label"><Server size={14} /> Backend Service</span>
                <span className={`metric-value ${isConnected ? 'success' : 'danger'}`}>
                  {isConnected ? 'Online' : 'Disconnected'}
                </span>
              </div>
              <div className="metric-item">
                <span className="metric-label"><Database size={14} /> Database Connection</span>
                <span className={`metric-value ${isConnected && data?.database?.status === 'connected' ? 'success' : 'warning'}`}>
                  {isConnected ? `${data?.database?.status || 'Connected'}` : 'Offline'}
                </span>
              </div>
              <div className="metric-item">
                <span className="metric-label"><Globe size={14} /> Official Data Feed</span>
                <span className="metric-value success">USGS Earthquake Hazards</span>
              </div>
              <div className="metric-item">
                <span className="metric-label"><FileCheck size={14} /> Verification Engine</span>
                <span className="metric-value success">Evidence-Linked Rule Evaluation</span>
              </div>
            </div>
          </div>

          {/* Card 2: Live Health Inspector */}
          <div className="card">
            <div className="card-header">
              <div className="card-title-group">
                <div className="card-icon">
                  <Server size={18} />
                </div>
                <h3 className="card-title" style={{ fontSize: '0.95rem' }}>Live API Health Inspector</h3>
              </div>
              <button
                className="btn btn-outline"
                onClick={checkHealth}
                disabled={isChecking}
                style={{ padding: '0.28rem 0.65rem', fontSize: '0.75rem' }}
              >
                <RefreshCw size={12} className={isChecking ? 'animate-spin' : ''} />
                <span>{isChecking ? 'Pinging...' : 'Ping'}</span>
              </button>
            </div>

            <div className="metrics-list">
              <div className="metric-item">
                <span className="metric-label">Target Endpoint</span>
                <span className="metric-value" style={{ fontSize: '0.75rem' }}>{endpoint || 'GET /api/health'}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Roundtrip Latency</span>
                <span className="metric-value success">{latencyMs !== null ? `${latencyMs} ms` : '—'}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label"><Clock size={13} /> Server Uptime</span>
                <span className="metric-value">{data?.uptimeSeconds !== undefined ? `${data.uptimeSeconds}s` : '—'}</span>
              </div>
            </div>

            {/* View raw JSON */}
            <div style={{ marginTop: '0.75rem' }}>
              <pre className="code-block" style={{ fontSize: '0.72rem', padding: '0.6rem', maxHeight: '120px', overflowY: 'auto' }}>
                {raw ? JSON.stringify(raw, null, 2) : error ? JSON.stringify({ error }, null, 2) : '// No data'}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Primary Dashboard Area: Claim Verification Workspace + Recent Submissions */}
      <section className="dashboard-workspace-grid">
        {/* Left Column: Claim Verification Workspace */}
        <div>
          <ClaimExtractionCard
            selectedClaimId={selectedClaimId}
            onClearSelectedClaim={() => {
              setSelectedClaimId(null);
              setActiveClaim(null);
            }}
            onClaimSubmitted={handleClaimSubmitted}
            onClaimActive={(claim) => setActiveClaim(claim)}
          />
        </div>

        {/* Right Column: Recent Persisted Claims Panel */}
        <div>
          <RecentClaimsPanel
            onSelectClaim={handleSelectClaim}
            selectedClaimId={selectedClaimId}
            refreshTrigger={claimsRefreshTrigger}
          />
        </div>
      </section>

      {/* Interactive Geographic Intelligence Map with Claim Spatial Overlay */}
      <section style={{ marginBottom: '2rem' }}>
        <GeographicIntelligenceMap activeClaim={activeClaim} />
      </section>

      {/* Secondary Dashboard Area: Authoritative Incident Sources Panel */}
      <section style={{ marginTop: '1rem', marginBottom: '2.5rem' }}>
        <IncidentSourcePanel />
      </section>

      {/* Verification Verdicts Guide */}
      <section className="pipeline-banner" style={{ marginTop: '1rem' }}>
        <div className="pipeline-header">
          <div className="card-icon" style={{ width: '40px', height: '40px', borderRadius: '10px' }}>
            <Info size={22} />
          </div>
          <div>
            <div className="pipeline-badge">Verification Guide</div>
            <h2 className="pipeline-title" style={{ fontSize: '1.15rem' }}>Understanding Verification Verdicts</h2>
            <p className="pipeline-desc" style={{ fontSize: '0.85rem' }}>
              Every statement is evaluated against official emergency reports and alerts. 'Verified' indicates support by available official records, not absolute certainty. When evidence is incomplete or missing, statements remain Unverified.
            </p>
          </div>
        </div>

        <div className="statuses-grid" style={{ marginTop: '1rem' }}>
          <div className="status-card">
            <div className="status-card-header">
              <span className="status-tag verified">VERIFIED</span>
            </div>
            <p className="status-explanation">
              Available evidence supports this statement.
            </p>
          </div>

          <div className="status-card">
            <div className="status-card-header">
              <span className="status-tag conflicting">CONFLICTING</span>
            </div>
            <p className="status-explanation">
              Available evidence contradicts this statement.
            </p>
          </div>

          <div className="status-card">
            <div className="status-card-header">
              <span className="status-tag outdated">OUTDATED</span>
            </div>
            <p className="status-explanation">
              Newer evidence supersedes earlier information.
            </p>
          </div>

          <div className="status-card">
            <div className="status-card-header">
              <span className="status-tag unverified">UNVERIFIED</span>
            </div>
            <p className="status-explanation">
              There is not enough evidence to confirm this statement.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer" style={{ marginTop: '3rem' }}>
        <p>SignalTrace — When information matters, follow the evidence. Built for HACKNOVA'26 Finals.</p>
        <p style={{ marginTop: '0.35rem', fontSize: '0.78rem' }}>
          Evidence-based disaster report verification with transparent provenance.
        </p>
      </footer>

      {/* Interactive Citizen WhatsApp / SMS Helpline Simulator */}
      <CitizenBotSimulator />
    </div>
  );
};

export default DashboardShell;
