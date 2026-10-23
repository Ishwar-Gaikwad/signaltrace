import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  Printer,
  Shield,
  Truck,
  HeartPulse,
  Users,
  FileText
} from 'lucide-react';

export const SitRepExportModal = ({ isOpen, onClose, claim, verificationResults = [] }) => {
  const [activeTab, setActiveTab] = useState('responder');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const claimText = claim?.originalText || claim?.rawText || 'Disaster message';
  const timestamp = new Date().toLocaleString();
  const claimId = claim?._id ? claim._id.slice(-8) : 'ACTIVE';

  // Group verified vs conflicting vs unverified
  const verifiedItems = verificationResults.filter((r) => r.verificationStatus === 'Verified');
  const conflictingItems = verificationResults.filter((r) => r.verificationStatus === 'Conflicting');
  const outdatedItems = verificationResults.filter((r) => r.verificationStatus === 'Outdated');
  const unverifiedItems = verificationResults.filter((r) => r.verificationStatus === 'Unverified');

  // Generate role-specific SitRep texts
  const generateResponderBrief = () => `================================================================================
SIGNALTRACE EMERGENCY DISPATCH SITUATION REPORT (SITREP)
INCIDENT ACTION PACK ID: ST-${claimId} | GENERATED: ${timestamp}
STAKEHOLDER: Emergency First Responders & Field Incident Commanders
================================================================================

1. SOURCE INTEL ANALYZED
Raw Post: "${claimText}"
Platform: ${claim?.sourcePlatform || 'web-submission'}
Audit Verification Method: Deterministic Corroboration Engine

2. ACTIONABLE VERIFIED OPERATIONAL FACTS (${verifiedItems.length} verified):
${verifiedItems.length > 0
  ? verifiedItems.map((v, i) => `[VERIFIED #${i + 1}] ${v.claimText || v.text}\n  Authority Citation: ${v.explanation || 'Corroborated by official bulletins'}`).join('\n\n')
  : '  No operational statements verified yet.'}

3. CRITICAL MISINFORMATION / CONTRADICTED ALARMS (${conflictingItems.length} contradicted):
${conflictingItems.length > 0
  ? conflictingItems.map((c, i) => `[FALSE ALARM #${i + 1}] ${c.claimText || c.text}\n  Contradiction Notice: ${c.explanation || 'Refuted by official assessments'}`).join('\n\n')
  : '  No conflicting claims detected in this report.'}

4. OUTDATED / SUPERSEDED WARNINGS (${outdatedItems.length} outdated):
${outdatedItems.length > 0
  ? outdatedItems.map((o, i) => `[SUPERSEDED #${i + 1}] ${o.claimText || o.text}\n  Reason: ${o.explanation || 'Superseded by newer bulletin'}`).join('\n\n')
  : '  No outdated warnings detected.'}

5. UNCONFIRMED / RUMOR WARNING (${unverifiedItems.length} unconfirmed):
${unverifiedItems.length > 0
  ? unverifiedItems.map((u, i) => `[UNVERIFIED #${i + 1}] ${u.claimText || u.text}\n  Notice: Exercise caution. Insufficient evidence in official repositories.`).join('\n\n')
  : '  All statements evaluated with conclusive evidence.'}

--------------------------------------------------------------------------------
DISPATCH ACTION DIRECTIVE: Deploy field resources only to corroborated zones.
Do NOT dispatch based on unverified or contradicted casualty figures.
================================================================================`;

  const generateHospitalBrief = () => `================================================================================
SIGNALTRACE HEALTHCARE & HOSPITAL SURGE READINESS BRIEF
HOSPITAL RESOURCE ADVISORY: ST-${claimId} | GENERATED: ${timestamp}
STAKEHOLDER: Hospitals, Trauma Centers & Medical Relief Coordinators
================================================================================

1. TRIAGE INTELLIGENCE SUMMARY
Reported Event: "${claimText}"
Mass Casualty / Damage Assertion Status:
${conflictingItems.filter((c) => (c.claimText || '').toLowerCase().includes('dead') || (c.claimText || '').toLowerCase().includes('flattened')).length > 0
  ? '⚠️ EXAGGERATED CASUALTY ALARM: Official reports confirm lower casualty severity than claimed on social media.'
  : 'ℹ️ Monitor local ambulance intake channels.'}

2. VERIFIED MEDICAL / EVACUATION ADVISORIES:
${verifiedItems.map((v) => `• ${v.claimText || v.text}`).join('\n') || '• No hospital-specific alerts currently verified.'}

3. UTILITY & INFRASTRUCTURE STATUS:
• Check back-up generator readiness if power grid interruptions were alleged.
• Verify ambulance transit routes against official road status reports.

--------------------------------------------------------------------------------
MEDICAL COMMAND ADVICE: Maintain normal triage surge protocols without panic.
Ground hospital staffing decisions in authoritative civil defense bulletins.
================================================================================`;

  const generateCitizenBrief = () => `================================================================================
SIGNALTRACE CITIZEN SAFETY & FACT-CHECK ADVISORY
PUBLIC INFORMATION DISPATCH: ST-${claimId}
================================================================================

WHAT IS BEING SHARED:
"${claimText}"

WHAT YOU SHOULD KNOW (OFFICIAL FACT CHECK):
${conflictingItems.length > 0
  ? `❌ FALSE / INACCURATE CLAIMS:\n${conflictingItems.map((c) => `  • "${c.claimText || c.text}" — ${c.explanation}`).join('\n')}\n`
  : ''}${verifiedItems.length > 0
  ? `✅ CONFIRMED FACTS:\n${verifiedItems.map((v) => `  • "${v.claimText || v.text}" — Officially confirmed.`).join('\n')}\n`
  : ''}${outdatedItems.length > 0
  ? `⏰ OUTDATED INFORMATION:\n${outdatedItems.map((o) => `  • "${o.claimText || o.text}" — Newer government updates have superseded this.`).join('\n')}\n`
  : ''}
WHAT YOU SHOULD DO:
1. Do not forward unverified messages or exaggerated numbers.
2. Follow instructions exclusively from local disaster management authorities (NDMA/DEOC).
3. Check SignalTrace for real-time verification before sharing emergency alerts.
================================================================================`;

  const currentText =
    activeTab === 'responder'
      ? generateResponderBrief()
      : activeTab === 'hospital'
      ? generateHospitalBrief()
      : generateCitizenBrief();

  const handleCopy = () => {
    navigator.clipboard.writeText(currentText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([currentText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SignalTrace-SitRep-${activeTab}-${claimId}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#090e1b',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: '740px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.1rem 1.4rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.02)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(56, 189, 248, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-cyan)'
              }}
            >
              <FileText size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#ffffff' }}>
                Generate Emergency SitRep & Action Brief
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Export verified disaster intelligence tailored for emergency stakeholders
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-outline"
            style={{ padding: '0.3rem 0.5rem', borderRadius: '50%' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Stakeholder Persona Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            padding: '0.75rem 1.4rem',
            background: 'rgba(0, 0, 0, 0.25)',
            borderBottom: '1px solid var(--border-subtle)'
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('responder')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: activeTab === 'responder' ? '1px solid #38bdf8' : '1px solid var(--border-subtle)',
              background: activeTab === 'responder' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: activeTab === 'responder' ? '#38bdf8' : 'var(--text-secondary)'
            }}
          >
            <Truck size={14} />
            <span>Emergency Responders</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hospital')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: activeTab === 'hospital' ? '1px solid #fb7185' : '1px solid var(--border-subtle)',
              background: activeTab === 'hospital' ? 'rgba(251, 113, 133, 0.15)' : 'transparent',
              color: activeTab === 'hospital' ? '#fb7185' : 'var(--text-secondary)'
            }}
          >
            <HeartPulse size={14} />
            <span>Hospital & Healthcare</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('citizen')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: activeTab === 'citizen' ? '1px solid #34d399' : '1px solid var(--border-subtle)',
              background: activeTab === 'citizen' ? 'rgba(52, 211, 153, 0.15)' : 'transparent',
              color: activeTab === 'citizen' ? '#34d399' : 'var(--text-secondary)'
            }}
          >
            <Users size={14} />
            <span>Public Safety / Citizens</span>
          </button>
        </div>

        {/* SitRep Text Body */}
        <div style={{ padding: '1rem 1.4rem', flex: 1, overflowY: 'auto' }}>
          <pre
            style={{
              margin: 0,
              padding: '1rem',
              background: '#040711',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.76rem',
              fontFamily: 'var(--font-mono)',
              color: '#cbd5e1',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.55,
              maxHeight: '380px',
              overflowY: 'auto'
            }}
          >
            {currentText}
          </pre>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '0.85rem 1.4rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.01)'
          }}
        >
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Grounded in stored authoritative repository bulletins
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={handlePrint}
              style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Printer size={13} />
              <span>Print Brief</span>
            </button>

            <button
              type="button"
              className="btn btn-outline"
              onClick={handleDownload}
              style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Download size={13} />
              <span>Download (.md)</span>
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCopy}
              style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              <span>{copied ? 'Copied SitRep!' : 'Copy to Clipboard'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SitRepExportModal;
