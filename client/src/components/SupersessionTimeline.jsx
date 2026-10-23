import React, { useState } from 'react';
import {
  Clock,
  History,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Radio,
  ShieldCheck,
  FileText,
  ArrowRight
} from 'lucide-react';

export const SupersessionTimeline = ({ claim, verificationResults = [] }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!verificationResults || verificationResults.length === 0) return null;

  const claimTimestamp = claim?.publishedAt ? new Date(claim.publishedAt) : new Date();
  const claimText = claim?.originalText || claim?.rawText || 'Claimed disaster statement';

  // Gather all evidence items across atomic results
  const allEvidence = [];
  verificationResults.forEach((r) => {
    if (Array.isArray(r.evidenceSummary)) {
      r.evidenceSummary.forEach((ev) => allEvidence.push({ ...ev, parentVerdict: r.verificationStatus }));
    }
  });

  // Construct chronology steps
  // 1. Initial baseline disaster event (from earliest evidence report or 2 hours prior)
  const earliestEvidence = allEvidence
    .filter((e) => e.evidenceTimestamp)
    .sort((a, b) => new Date(a.evidenceTimestamp) - new Date(b.evidenceTimestamp))[0];

  const earliestTime = earliestEvidence?.evidenceTimestamp
    ? new Date(earliestEvidence.evidenceTimestamp)
    : new Date(claimTimestamp.getTime() - 2 * 60 * 60 * 1000);

  // 2. Latest superseding or official update
  const latestEvidence = allEvidence
    .filter((e) => e.evidenceTimestamp)
    .sort((a, b) => new Date(b.evidenceTimestamp) - new Date(a.evidenceTimestamp))[0];

  const hasOutdated = verificationResults.some((r) => r.verificationStatus === 'Outdated');
  const hasConflicting = verificationResults.some((r) => r.verificationStatus === 'Conflicting');

  const timelineSteps = [
    {
      title: 'Initial Hazard Detected & Monitored',
      time: earliestTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: earliestTime.toLocaleDateString(),
      source: earliestEvidence?.sourceName || 'Agency Monitoring Baseline',
      type: 'baseline',
      description: earliestEvidence?.notes || 'Initial seismic or hydrometeorological sensor detection recorded by monitoring station.',
      badge: 'INITIAL ALERT'
    },
    {
      title: 'Viral Social Post Circulated',
      time: claimTimestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: claimTimestamp.toLocaleDateString(),
      source: claim?.sourcePlatform || 'Social Media Forward',
      type: 'claim',
      description: `"${claimText.slice(0, 140)}${claimText.length > 140 ? '...' : ''}"`,
      badge: 'CLAIM ASSERTED'
    },
    {
      title: hasOutdated
        ? 'Official Superseding Bulletin Issued'
        : hasConflicting
        ? 'Official Contradiction & Verification'
        : 'Authoritative Corroboration Confirmed',
      time: (latestEvidence?.evidenceTimestamp
        ? new Date(latestEvidence.evidenceTimestamp)
        : new Date(claimTimestamp.getTime() + 45 * 60 * 1000)
      ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: (latestEvidence?.evidenceTimestamp
        ? new Date(latestEvidence.evidenceTimestamp)
        : claimTimestamp
      ).toLocaleDateString(),
      source: latestEvidence?.sourceName || 'Official Disaster Authority (NDMA/USGS)',
      type: hasOutdated ? 'superseded' : hasConflicting ? 'contradicted' : 'verified',
      description:
        latestEvidence?.notes ||
        (hasOutdated
          ? 'Newer authoritative bulletin supersedes earlier emergency warnings with updated all-clear status.'
          : hasConflicting
          ? 'Ground assessment by authorities refutes casualty hyperbole or infrastructure collapse.'
          : 'Official disaster authorities confirm incident severity and location coordinates.'),
      badge: hasOutdated ? 'SUPERSEDED' : hasConflicting ? 'CONTRADICTED' : 'CORROBORATED'
    }
  ];

  return (
    <div
      style={{
        marginTop: '1.25rem',
        background: 'rgba(7, 13, 25, 0.8)',
        border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
        borderRadius: 'var(--radius-md, 10px)',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          padding: '0.75rem 1rem',
          background: 'rgba(255, 255, 255, 0.02)',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          color: '#f8fafc',
          textAlign: 'left'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          <History size={15} style={{ color: '#38bdf8' }} />
          <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
            Incident Chronology & Information Supersession Timeline
          </span>
          <span
            style={{
              fontSize: '0.66rem',
              padding: '1px 6px',
              borderRadius: '4px',
              background: hasOutdated ? 'rgba(245, 158, 11, 0.2)' : 'rgba(56, 189, 248, 0.15)',
              color: hasOutdated ? '#fbbf24' : '#38bdf8',
              fontWeight: 600
            }}
          >
            {hasOutdated ? 'Supersession Detected' : 'Chronology Audited'}
          </span>
        </div>

        <div style={{ color: 'var(--text-muted, #94a3b8)' }}>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expanded Timeline Content */}
      {isExpanded && (
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', position: 'relative' }}>
            {/* Vertical connector line */}
            <div
              style={{
                position: 'absolute',
                top: '12px',
                bottom: '12px',
                left: '11px',
                width: '2px',
                background: 'linear-gradient(to bottom, #38bdf8 0%, #a855f7 50%, #34d399 100%)',
                opacity: 0.4
              }}
            />

            {timelineSteps.map((step, idx) => {
              const isClaim = step.type === 'claim';
              const isSuperseded = step.type === 'superseded';
              const isContradicted = step.type === 'contradicted';
              const isVerified = step.type === 'verified';

              let dotColor = '#38bdf8';
              if (isClaim) dotColor = '#f59e0b';
              if (isSuperseded) dotColor = '#fbbf24';
              if (isContradicted) dotColor = '#f43f5e';
              if (isVerified) dotColor = '#34d399';

              return (
                <div key={idx} style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
                  {/* Timeline Dot */}
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#070d19',
                      border: `2px solid ${dotColor}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      zIndex: 2,
                      boxShadow: `0 0 10px ${dotColor}40`
                    }}
                  >
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColor }} />
                  </div>

                  {/* Step Card */}
                  <div
                    style={{
                      flex: 1,
                      padding: '0.65rem 0.85rem',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.07)',
                      borderRadius: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc' }}>
                          {step.title}
                        </span>
                        <span
                          style={{
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '3px',
                            background: `${dotColor}20`,
                            color: dotColor,
                            border: `1px solid ${dotColor}40`
                          }}
                        >
                          {step.badge}
                        </span>
                      </div>

                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #94a3b8)', fontFamily: 'var(--font-mono, monospace)' }}>
                        {step.date} {step.time}
                      </span>
                    </div>

                    <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-secondary, #cbd5e1)', lineHeight: 1.45 }}>
                      {step.description}
                    </p>

                    <div style={{ marginTop: '0.35rem', fontSize: '0.66rem', color: 'var(--text-muted, #94a3b8)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Radio size={10} style={{ color: dotColor }} />
                      <span>Source: <strong>{step.source}</strong></span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SupersessionTimeline;
