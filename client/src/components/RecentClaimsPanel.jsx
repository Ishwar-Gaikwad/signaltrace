/**
 * SignalTrace — Recent Claims Panel
 *
 * Displays recently ingested disaster claims from the database via GET /api/claims.
 * Provides verdict filtering (Verified, Conflicting, Outdated, Unverified),
 * interactive selection to load into the verification workspace, and honest
 * status indicators without fabricated records.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  HelpCircle,
  RefreshCw,
  Layers,
  ArrowRight,
  Filter,
  AlertTriangle
} from 'lucide-react';
import { fetchClaims } from '../services/api';

const VERDICT_FILTERS = [
  { key: 'All', label: 'All Reports' },
  { key: 'Verified', label: 'Verified', color: 'var(--accent-emerald)' },
  { key: 'Conflicting', label: 'Conflicting', color: 'var(--accent-rose)' },
  { key: 'Outdated', label: 'Outdated', color: 'var(--accent-amber)' },
  { key: 'Unverified', label: 'Unverified', color: 'var(--text-muted)' }
];

export const RecentClaimsPanel = ({ selectedClaimId, onSelectClaim, refreshTrigger = 0 }) => {
  const [claims, setClaims] = useState([]);
  const [meta, setMeta] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeVerdict, setActiveVerdict] = useState('All');

  const loadClaims = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const verdictParam = activeVerdict === 'All' ? null : activeVerdict;
      const response = await fetchClaims({
        page: 1,
        limit: 10,
        verdict: verdictParam
      });
      setClaims(response.claims || []);
      setMeta(response.meta || {});
    } catch (err) {
      setError(err.message || 'Failed to load claims');
    } finally {
      setIsLoading(false);
    }
  }, [activeVerdict]);

  useEffect(() => {
    loadClaims();
  }, [loadClaims, refreshTrigger]);

  const formatTimestamp = (dateString) => {
    if (!dateString) return 'Unknown date';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  // Extract unique verification statuses present across atomic claims
  const getClaimVerdictBadges = (claim) => {
    if (!claim.atomicClaims || claim.atomicClaims.length === 0) {
      return [{ label: 'PENDING', className: 'status-tag' }];
    }

    const statuses = new Set();
    claim.atomicClaims.forEach((atom) => {
      if (atom.verificationStatus && atom.verificationStatus !== 'pending') {
        statuses.add(atom.verificationStatus);
      }
    });

    if (statuses.size === 0) {
      return [{ label: 'PENDING', className: 'status-tag' }];
    }

    return Array.from(statuses).map((status) => {
      switch (status) {
        case 'Verified':
          return { label: 'VERIFIED', className: 'status-tag verified' };
        case 'Conflicting':
          return { label: 'CONFLICTING', className: 'status-tag conflicting' };
        case 'Outdated':
          return { label: 'OUTDATED', className: 'status-tag outdated' };
        case 'Unverified':
        default:
          return { label: 'UNVERIFIED', className: 'status-tag unverified' };
      }
    });
  };

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Panel Header */}
      <div className="card-header">
        <div className="card-title-group">
          <div className="card-icon" style={{ background: 'rgba(56, 189, 248, 0.1)' }}>
            <Layers size={18} />
          </div>
          <div>
            <h2 className="card-title" style={{ fontSize: '1rem' }}>Recent Reports</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {meta.totalRecords !== undefined ? `${meta.totalRecords} reports checked` : 'Recent reports'}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-outline"
          onClick={loadClaims}
          disabled={isLoading}
          aria-label="Refresh claims list"
          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
        >
          <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Verdict Filter Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.35rem',
          padding: '0.75rem 1rem',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(0,0,0,0.15)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginRight: '0.25rem', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
          <Filter size={11} />
          <span>Filter:</span>
        </div>
        {VERDICT_FILTERS.map((vf) => {
          const isActive = activeVerdict === vf.key;
          return (
            <button
              key={vf.key}
              type="button"
              onClick={() => setActiveVerdict(vf.key)}
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                padding: '0.2rem 0.55rem',
                borderRadius: 'var(--radius-full)',
                border: isActive
                  ? `1px solid ${vf.color || 'var(--accent-cyan)'}`
                  : '1px solid var(--border-subtle)',
                background: isActive
                  ? 'rgba(56, 189, 248, 0.15)'
                  : 'rgba(255, 255, 255, 0.03)',
                color: isActive
                  ? vf.color || 'var(--accent-cyan)'
                  : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {vf.label}
            </button>
          );
        })}
      </div>

      {/* Claims List Body */}
      <div style={{ flex: 1, overflowY: 'auto', maxHeight: '520px', padding: '0.75rem' }}>
        {/* Loading State */}
        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', padding: '0.5rem 0' }}>
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                style={{
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ height: '14px', width: '60%', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', marginBottom: '0.5rem' }} />
                <div style={{ height: '10px', width: '40%', background: 'rgba(255,255,255,0.04)', borderRadius: '4px' }} />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div
            style={{
              padding: '1rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(244, 63, 94, 0.08)',
              border: '1px solid rgba(244, 63, 94, 0.25)',
              color: 'var(--status-disconnected-text)',
              fontSize: '0.8rem',
              textAlign: 'center'
            }}
          >
            <AlertTriangle size={18} style={{ margin: '0 auto 0.4rem', display: 'block' }} />
            <p style={{ marginBottom: '0.5rem' }}>{error}</p>
            <button
              type="button"
              className="btn btn-outline"
              onClick={loadClaims}
              style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem' }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && claims.length === 0 && (
          <div
            style={{
              padding: '2.5rem 1rem',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.82rem'
            }}
          >
            <HelpCircle size={28} style={{ opacity: 0.35, margin: '0 auto 0.75rem', display: 'block' }} />
            <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
              No claims found
            </p>
            <p style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}>
              {activeVerdict === 'All'
                ? 'Submit a disaster post using the workspace to extract and verify factual claims.'
                : `No recorded claims match the "${activeVerdict}" verdict filter.`}
            </p>
          </div>
        )}

        {/* Claim Cards */}
        {!isLoading && !error && claims.map((claim) => {
          const isSelected = selectedClaimId === claim._id;
          const badges = getClaimVerdictBadges(claim);
          const atomicCount = claim.atomicClaims?.length || 0;

          return (
            <div
              key={claim._id}
              onClick={() => onSelectClaim(claim._id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectClaim(claim._id);
                }
              }}
              style={{
                padding: '0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: isSelected
                  ? 'rgba(56, 189, 248, 0.08)'
                  : 'rgba(255, 255, 255, 0.02)',
                border: isSelected
                  ? '1px solid var(--accent-cyan)'
                  : '1px solid var(--border-subtle)',
                marginBottom: '0.65rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                position: 'relative'
              }}
            >
              {/* Header meta */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Clock size={11} />
                  {formatTimestamp(claim.createdAt || claim.publishedAt)}
                </span>
                <span style={{ textTransform: 'capitalize', background: 'rgba(255,255,255,0.04)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                  {claim.sourcePlatform || 'web'}
                </span>
              </div>

              {/* Original text preview */}
              <p
                style={{
                  fontSize: '0.82rem',
                  color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                  lineHeight: 1.45,
                  marginBottom: '0.55rem',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}
              >
                {claim.originalText}
              </p>

              {/* Footer: Verdict Badges & Atoms count */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                  {badges.map((b, idx) => (
                    <span key={idx} className={b.className} style={{ fontSize: '0.62rem', padding: '0.1rem 0.35rem' }}>
                      {b.label}
                    </span>
                  ))}
                  {atomicCount > 0 && (
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                      {atomicCount} {atomicCount === 1 ? 'statement' : 'statements'}
                    </span>
                  )}
                </div>

                <span style={{ color: isSelected ? 'var(--accent-cyan)' : 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                  <ArrowRight size={13} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecentClaimsPanel;
