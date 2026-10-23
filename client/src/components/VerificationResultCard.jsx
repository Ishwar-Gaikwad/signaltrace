import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  BookOpen,
  MapPin,
  Shield,
  AlertCircle,
  FileText,
  Share2
} from 'lucide-react';
import SitRepExportModal from './SitRepExportModal';
import DebunkCardModal from './DebunkCardModal';
import SupersessionTimeline from './SupersessionTimeline';
import MultimodalMediaCard from './MultimodalMediaCard';

// ---------------------------------------------------------------------------
// Status configuration: colours, icons, labels
// ---------------------------------------------------------------------------
const STATUS_CONFIG = {
  Verified: {
    label: 'VERIFIED',
    icon: CheckCircle2,
    color: 'var(--accent-emerald)',
    bg: 'rgba(52, 211, 153, 0.08)',
    border: 'rgba(52, 211, 153, 0.25)',
    tagClass: 'status-tag verified'
  },
  Conflicting: {
    label: 'CONFLICTING',
    icon: XCircle,
    color: 'var(--accent-rose)',
    bg: 'rgba(251, 113, 133, 0.08)',
    border: 'rgba(251, 113, 133, 0.25)',
    tagClass: 'status-tag conflicting'
  },
  Outdated: {
    label: 'OUTDATED',
    icon: Clock,
    color: 'var(--accent-amber)',
    bg: 'rgba(251, 191, 36, 0.08)',
    border: 'rgba(251, 191, 36, 0.25)',
    tagClass: 'status-tag outdated'
  },
  Unverified: {
    label: 'UNVERIFIED',
    icon: HelpCircle,
    color: 'var(--text-muted)',
    bg: 'rgba(255, 255, 255, 0.03)',
    border: 'var(--border-subtle)',
    tagClass: 'status-tag unverified'
  },
  pending: {
    label: 'PENDING',
    icon: AlertCircle,
    color: 'var(--text-secondary)',
    bg: 'rgba(255, 255, 255, 0.03)',
    border: 'var(--border-subtle)',
    tagClass: 'status-tag'
  }
};

// ---------------------------------------------------------------------------
// EvidenceExcerpt sub-component
// ---------------------------------------------------------------------------
const EvidenceExcerpt = ({ excerpt }) => (
  <div
    style={{
      padding: '0.65rem 0.85rem',
      borderRadius: 'var(--radius-sm)',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid var(--border-subtle)',
      fontSize: '0.82rem'
    }}
  >
    <p style={{ color: 'var(--text-primary)', lineHeight: 1.55, marginBottom: '0.4rem', fontStyle: 'italic' }}>
      "{excerpt.excerptText}"
    </p>
    {(excerpt.sourceName || excerpt.sourceRef) && (
      <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
        — {excerpt.sourceName || excerpt.sourceRef}
        {excerpt.url && (
          <> · <a href={excerpt.url} target="_blank" rel="noopener noreferrer"
            style={{ color: 'var(--accent-cyan)', textDecoration: 'none' }}>Source</a></>
        )}
      </p>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// SingleAtomicVerification — one atomic claim result card
// ---------------------------------------------------------------------------
const SingleAtomicVerification = ({ result, index }) => {
  const [expanded, setExpanded] = useState(false);
  const status = result.verificationStatus;
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Unverified;
  const Icon = cfg.icon;

  const evidenceState = (() => {
    if (status === 'Conflicting') {
      return { label: 'CONTRADICTS OFFICIAL REPORT', bg: 'rgba(251, 113, 133, 0.12)', color: 'var(--accent-rose)' };
    }
    if (status === 'Outdated') {
      return { label: 'SUPERSEDED BY NEWER UPDATE', bg: 'rgba(251, 191, 36, 0.12)', color: 'var(--accent-amber)' };
    }
    if (status === 'Verified') {
      return { label: 'SUPPORTED BY OFFICIAL REPORT', bg: 'rgba(52, 211, 153, 0.12)', color: 'var(--accent-emerald)' };
    }
    if (status === 'Unverified') {
      const hasInsufficientDocs = result.evidenceSummary?.some((ev) => ev.role === 'insufficient');
      if (hasInsufficientDocs) {
        return { label: 'DETAILS NOT FOUND IN REPORT', bg: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-amber)' };
      }
      return { label: 'NO MATCHING OFFICIAL RECORD', bg: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)' };
    }
    return null;
  })();

  return (
    <div
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        transition: 'border-color 0.2s'
      }}
    >
      {/* Header row */}
      <div
        style={{
          padding: '1rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem'
        }}
      >
        {/* Status icon */}
        <div style={{ flexShrink: 0, marginTop: '2px' }}>
          <Icon size={18} style={{ color: cfg.color }} />
        </div>

        {/* Claim text + status badge */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem',
              fontWeight: 600,
              padding: '0.15rem 0.45rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(56, 189, 248, 0.12)',
              color: 'var(--accent-cyan)'
            }}>
              CLAIM #{index + 1}
            </span>
            <span className={cfg.tagClass} style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}>
              {cfg.label}
            </span>
            {evidenceState && (
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  padding: '0.12rem 0.45rem',
                  borderRadius: 'var(--radius-sm)',
                  background: evidenceState.bg,
                  color: evidenceState.color,
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
              >
                {evidenceState.label}
              </span>
            )}
          </div>

          <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: '0.4rem' }}>
            "{result.claimText || result.text}"
          </p>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {result.verificationExplanation}
          </p>
        </div>

        {/* Expand toggle */}
        {result.evidenceSummary?.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.72rem',
              flexShrink: 0,
              padding: '0.2rem',
              borderRadius: 'var(--radius-sm)',
              transition: 'color 0.15s'
            }}
          >
            <BookOpen size={14} />
            <span>Evidence</span>
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>

      {/* Expanded evidence panel */}
      {expanded && result.evidenceSummary?.length > 0 && (
        <div
          style={{
            borderTop: `1px solid ${cfg.border}`,
            padding: '0.85rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem'
          }}
        >
          {result.evidenceSummary.map((ev, eIdx) => (
            <div key={eIdx}>
              {/* Role badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  padding: '0.12rem 0.45rem',
                  borderRadius: 'var(--radius-sm)',
                  background: ev.role === 'supporting'
                    ? 'rgba(52, 211, 153, 0.12)'
                    : ev.role === 'contradicting'
                    ? 'rgba(251, 113, 133, 0.12)'
                    : 'rgba(255, 255, 255, 0.05)',
                  color: ev.role === 'supporting'
                    ? 'var(--accent-emerald)'
                    : ev.role === 'contradicting'
                    ? 'var(--accent-rose)'
                    : 'var(--text-muted)'
                }}>
                  {ev.role}
                </span>

                {ev.geographicRelevance?.distanceKm != null && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <MapPin size={11} />
                    {ev.geographicRelevance.distanceKm === 0
                      ? 'Exact match'
                      : `${ev.geographicRelevance.distanceKm} km from claim`}
                  </span>
                )}
              </div>

              {/* Excerpts */}
              {ev.excerpts?.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {ev.excerpts.map((exc, xIdx) => (
                    <EvidenceExcerpt key={xIdx} excerpt={exc} />
                  ))}
                </div>
              )}

              {ev.geographicRelevance?.notes && (
                <p style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <FileText size={11} /> {ev.geographicRelevance.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// VerificationResultCard — public component
// ---------------------------------------------------------------------------
export const VerificationResultCard = ({ claimId, verificationResults, claimData }) => {
  const [showSitRepModal, setShowSitRepModal] = useState(false);
  const [showDebunkModal, setShowDebunkModal] = useState(false);

  // If verificationResults not passed, extract from claimData.atomicClaims if verified
  let activeResults = verificationResults;
  if (!activeResults || activeResults.length === 0) {
    if (claimData?.atomicClaims && claimData.atomicClaims.some(ac => ac.verificationStatus && ac.verificationStatus !== 'pending')) {
      activeResults = claimData.atomicClaims.map(ac => ({
        atomicClaimId: ac.atomicClaimId,
        claimText: ac.text || ac.claimText,
        verificationStatus: ac.verificationStatus,
        explanation: ac.evidenceExplanation || ac.explanation,
        evidenceSummary: ac.evidenceSummary || []
      }));
    }
  }

  if (!activeResults || activeResults.length === 0) return null;

  const counts = activeResults.reduce(
    (acc, r) => {
      acc[r.verificationStatus] = (acc[r.verificationStatus] || 0) + 1;
      return acc;
    },
    {}
  );

  // Merge text into verificationResults from claimData.atomicClaims for display
  const enriched = activeResults.map((result) => {
    const matchingAtom = claimData?.atomicClaims?.find(
      (ac) => ac.atomicClaimId === result.atomicClaimId
    );
    return {
      ...result,
      claimText: matchingAtom?.text || matchingAtom?.claimText || result.claimText || result.atomicClaimId
    };
  });

  return (
    <div
      className="card"
      style={{
        marginTop: '1.5rem',
        borderColor: 'rgba(56, 189, 248, 0.2)',
        background: 'rgba(14, 20, 35, 0.9)'
      }}
    >
      {/* Header with SitRep Export Button */}
      <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="card-title-group">
          <div className="card-icon" style={{ background: 'rgba(56, 189, 248, 0.1)' }}>
            <Shield size={20} style={{ color: 'var(--accent-cyan)' }} />
          </div>
          <div>
            <h2 className="card-title">Verification Results</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Cross-referenced against official disaster alerts and reports
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.45rem' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setShowDebunkModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.35rem 0.75rem',
              fontSize: '0.76rem',
              borderColor: 'rgba(244, 63, 94, 0.4)',
              color: '#fb7185',
              background: 'rgba(244, 63, 94, 0.08)'
            }}
            title="Generate Shareable Disaster Fact-Check Graphic for Twitter, WhatsApp Status, and Instagram"
          >
            <Share2 size={14} />
            <span>Debunk Card</span>
          </button>

          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setShowSitRepModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.35rem 0.75rem',
              fontSize: '0.76rem',
              borderColor: 'rgba(56, 189, 248, 0.4)',
              color: 'var(--accent-cyan)',
              background: 'rgba(56, 189, 248, 0.08)'
            }}
            title="Export Actionable Emergency Situation Report for Responders, Hospitals, and Citizens"
          >
            <FileText size={14} />
            <span>Export SitRep</span>
          </button>
        </div>
      </div>

      {/* Status summary pills & Freshness Gauge */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
        {Object.entries(counts).map(([status, count]) => {
          const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Unverified;
          return (
            <span
              key={status}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.3rem 0.7rem',
                borderRadius: '100px',
                fontSize: '0.75rem',
                fontWeight: 600,
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
                color: cfg.color
              }}
            >
              {count}× {status}
            </span>
          );
        })}

        {/* Temporal Freshness Gauge */}
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.3rem 0.75rem',
            borderRadius: '100px',
            fontSize: '0.74rem',
            fontWeight: 600,
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            color: '#38bdf8',
            marginLeft: 'auto'
          }}
        >
          <Clock size={12} />
          <span>Freshness: Authoritative Feed Synchronized</span>
        </span>
      </div>

      {/* Individual results */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {enriched.map((result, idx) => (
          <SingleAtomicVerification key={result.atomicClaimId || idx} result={result} index={idx} />
        ))}
      </div>

      {/* Multimodal Visual Intelligence (CrisisMMD Grounding) */}
      <MultimodalMediaCard
        mediaAttachments={claimData?.mediaAttachments}
        claimText={claimData?.originalText}
      />

      {/* Incident Chronology & Supersession Timeline */}
      <SupersessionTimeline claim={claimData} verificationResults={enriched} />

      {/* Verification note */}
      <p style={{
        marginTop: '1.25rem',
        fontSize: '0.73rem',
        color: 'var(--text-muted)',
        borderTop: '1px solid var(--border-subtle)',
        paddingTop: '0.85rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem'
      }}>
        <FileText size={12} />
        Evidence checked against official alerts and reports. Report ID: {claimId?.slice(-8)}
      </p>

      {/* Stakeholder Actionable SitRep Export Modal */}
      <SitRepExportModal
        isOpen={showSitRepModal}
        onClose={() => setShowSitRepModal(false)}
        claim={claimData}
        verificationResults={enriched}
      />

      {/* Shareable Social Media Debunk Graphic Modal */}
      <DebunkCardModal
        isOpen={showDebunkModal}
        onClose={() => setShowDebunkModal(false)}
        claim={claimData}
        verificationResults={enriched}
      />
    </div>
  );
};

export default VerificationResultCard;
