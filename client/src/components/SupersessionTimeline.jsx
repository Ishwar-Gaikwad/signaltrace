import React, { useState } from 'react';
import {
  History,
  ChevronDown,
  ChevronUp,
  Radio
} from 'lucide-react';

export const SupersessionTimeline = ({ claim, verificationResults = [] }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!verificationResults || verificationResults.length === 0) return null;

  const claimTimestamp = claim?.publishedAt && Number.isFinite(new Date(claim.publishedAt).getTime())
    ? new Date(claim.publishedAt)
    : null;
  const claimText = claim?.originalText || claim?.rawText || 'Claimed disaster statement';

  // Gather all evidence items across atomic results
  const allEvidence = [];
  verificationResults.forEach((r) => {
    if (Array.isArray(r.evidenceSummary)) {
      r.evidenceSummary.forEach((ev) => allEvidence.push({ ...ev, parentVerdict: r.verificationStatus }));
    }
  });

  // Construct chronology steps
  // Evidence chronology uses only timestamps stored with linked evidence.
  const earliestEvidence = allEvidence
    .filter((e) => e.evidenceTimestamp)
    .sort((a, b) => new Date(a.evidenceTimestamp) - new Date(b.evidenceTimestamp))[0];

  // Only display timestamps actually supplied by the claim or its linked evidence.
  const latestEvidence = allEvidence
    .filter((e) => e.evidenceTimestamp)
    .sort((a, b) => new Date(b.evidenceTimestamp) - new Date(a.evidenceTimestamp))[0];

  const hasOutdated = verificationResults.some((r) => r.verificationStatus === 'Outdated');

  const formatTime = (value) => value
    ? `${new Date(value).toLocaleDateString()} ${new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'Timestamp unavailable';
  const evidenceStep = (evidence, title) => ({
    title,
    time: formatTime(evidence.evidenceTimestamp),
    source: evidence.excerpts?.[0]?.sourceName || evidence.excerpts?.[0]?.sourceRef || 'Source name unavailable',
    type: evidence.supersedes ? 'superseded' : evidence.role === 'contradicting' ? 'contradicted' : evidence.role === 'supporting' ? 'verified' : 'evidence',
    description: evidence.explanation || 'No source explanation was provided.',
    badge: evidence.isSynthetic ? 'DEMO SOURCE' : evidence.role.toUpperCase()
  });

  const timelineSteps = [
    ...(earliestEvidence ? [evidenceStep(earliestEvidence, 'Linked source report')] : []),
    {
      title: 'Viral Social Post Circulated',
      time: formatTime(claimTimestamp),
      source: claim?.sourcePlatform || 'Social Media Forward',
      type: 'claim',
      description: `"${claimText.slice(0, 140)}${claimText.length > 140 ? '...' : ''}"`,
      badge: 'CLAIM ASSERTED'
    },
    ...(latestEvidence && latestEvidence !== earliestEvidence
      ? [evidenceStep(latestEvidence, latestEvidence.supersedes ? 'Later source correction' : 'Linked source report')]
      : [])
  ];

  return (
    <div
      style={{
        marginTop: '1.25rem',
        background: '#ffffff',
        border: '1px solid var(--border-subtle, rgba(100, 116, 139, 0.2))',
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
          background: '#f8fafc',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          color: 'var(--text-primary, #172033)',
          textAlign: 'left'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          <History size={15} style={{ color: 'var(--accent-cyan, #0284c7)' }} />
          <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
            Recorded Claim and Evidence Times
          </span>
          <span
            style={{
              fontSize: '0.66rem',
              padding: '1px 6px',
              borderRadius: '4px',
              background: hasOutdated ? 'rgba(180, 83, 9, 0.1)' : 'rgba(2, 132, 199, 0.1)',
              color: hasOutdated ? '#a16207' : '#0369a1',
              fontWeight: 600
            }}
          >
            {hasOutdated ? 'Supersession Detected' : 'Recorded times only'}
          </span>
        </div>

        <div style={{ color: 'var(--text-muted, #94a3b8)' }}>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expanded Timeline Content */}
      {isExpanded && (
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(100, 116, 139, 0.16)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', position: 'relative' }}>
            {/* Vertical connector line */}
            <div
              style={{
                position: 'absolute',
                top: '12px',
                bottom: '12px',
                left: '11px',
                width: '2px',
                background: 'linear-gradient(to bottom, #0284c7 0%, #7c3aed 50%, #059669 100%)',
                opacity: 0.4
              }}
            />

            {timelineSteps.map((step, idx) => {
              const isClaim = step.type === 'claim';
              const isSuperseded = step.type === 'superseded';
              const isContradicted = step.type === 'contradicted';
              const isVerified = step.type === 'verified';

              let dotColor = '#0284c7';
              if (isClaim) dotColor = '#b45309';
              if (isSuperseded) dotColor = '#a16207';
              if (isContradicted) dotColor = '#e11d48';
              if (isVerified) dotColor = '#059669';

              return (
                <div key={idx} style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
                  {/* Timeline Dot */}
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#ffffff',
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
                      background: '#ffffff',
                      border: '1px solid rgba(100, 116, 139, 0.18)',
                      borderRadius: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary, #172033)' }}>
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
                        {step.time}
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
