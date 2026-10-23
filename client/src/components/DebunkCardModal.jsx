import React, { useRef, useEffect, useState } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  Printer,
  Share2,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

export const DebunkCardModal = ({ isOpen, onClose, claim, verificationResults = [] }) => {
  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);

  const claimText = claim?.originalText || claim?.rawText || 'Disaster message under investigation';
  const claimId = claim?._id ? claim._id.slice(-6).toUpperCase() : 'ACTIVE';
  const timestamp = new Date().toLocaleString();

  // Determine overall status
  const hasConflicting = verificationResults.some((r) => r.verificationStatus === 'Conflicting');
  const hasOutdated = verificationResults.some((r) => r.verificationStatus === 'Outdated');
  const hasVerified = verificationResults.some((r) => r.verificationStatus === 'Verified');

  let statusLabel = 'UNVERIFIED';
  let badgeColor = '#94a3b8';
  let badgeBg = '#1e293b';
  let badgeBorder = '#475569';
  let iconText = 'ℹ️';

  if (hasConflicting) {
    statusLabel = 'DEBUNKED / CONFLICTING';
    badgeColor = '#fb7185';
    badgeBg = 'rgba(244, 63, 94, 0.2)';
    badgeBorder = '#f43f5e';
    iconText = '❌';
  } else if (hasOutdated) {
    statusLabel = 'OUTDATED / SUPERSEDED';
    badgeColor = '#fbbf24';
    badgeBg = 'rgba(245, 158, 11, 0.2)';
    badgeBorder = '#f59e0b';
    iconText = '⚠️';
  } else if (hasVerified) {
    statusLabel = 'VERIFIED BY OFFICIAL SOURCES';
    badgeColor = '#34d399';
    badgeBg = 'rgba(52, 211, 153, 0.2)';
    badgeBorder = '#10b981';
    iconText = '✅';
  }

  // Draw Canvas Graphic (1200 x 675 - 16:9 social share ratio)
  const renderCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1200;
    const height = 675;
    canvas.width = width;
    canvas.height = height;

    // 1. Background
    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, '#040711');
    bgGradient.addColorStop(0.5, '#071026');
    bgGradient.addColorStop(1, '#02050b');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Accent border
    ctx.strokeStyle = badgeBorder;
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, width - 6, height - 6);

    // Subtle inner grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 60; x < width; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 60; y < height; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 2. Top Header Bar
    ctx.fillStyle = badgeBorder;
    ctx.fillRect(0, 0, width, 14);

    // Agency & Platform Brand
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('SIGNALTRACE — DISASTER EMERGENCY FACT-CHECK BULLETIN', 50, 58);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`INCIDENT REF: #ST-${claimId}   |   VERIFIED: ${timestamp}`, 50, 85);

    // 3. Status Badge Box
    ctx.fillStyle = badgeBg;
    ctx.fillRect(50, 115, 1100, 75);
    ctx.strokeStyle = badgeBorder;
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 115, 1100, 75);

    ctx.fillStyle = badgeColor;
    ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`${iconText}  ${statusLabel}`, 75, 163);

    // 4. Viral Social Claim Box
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.fillRect(50, 215, 1100, 135);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(50, 215, 1100, 135);

    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('VIRAL SOCIAL MEDIA CLAIM / FORWARDED REPORT:', 75, 245);

    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'italic 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    wrapText(ctx, `"${claimText}"`, 75, 280, 1050, 28);

    // 5. Official Ground Reality / Verdict Explanation
    ctx.fillStyle = 'rgba(56, 189, 248, 0.06)';
    ctx.fillRect(50, 375, 1100, 165);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(50, 375, 1100, 165);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('OFFICIAL GROUND REALITY (GROUNDED IN USGS • GDACS • NDMA BULLETINS):', 75, 408);

    // Find primary explanation or summarize results
    const primaryResult =
      verificationResults.find((r) => r.verificationStatus === 'Conflicting') ||
      verificationResults.find((r) => r.verificationStatus === 'Outdated') ||
      verificationResults.find((r) => r.verificationStatus === 'Verified') ||
      verificationResults[0];

    const factText =
      primaryResult?.verificationExplanation ||
      'Cross-examination against national disaster databases and live monitoring feeds shows no authoritative confirmation.';

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    wrapText(ctx, factText, 75, 442, 1050, 26);

    // 6. Bottom Emergency Strip
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(50, 560, 1100, 68);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(50, 560, 1100, 68);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('⚠️ CITIZEN SAFETY INSTRUCTION:', 75, 588);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(
      'Do not forward unverified disaster alerts. In an emergency dial: 112 (National Emergency) | 1078 (Disaster Response) | 108 (Ambulance)',
      75,
      612
    );
  };

  // Helper to wrap text cleanly on canvas
  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    let linesDrawn = 0;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
        linesDrawn++;
        if (linesDrawn >= 3) {
          ctx.fillText(line + '...', x, currentY);
          return;
        }
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
  }

  useEffect(() => {
    if (isOpen) {
      setTimeout(renderCard, 50);
    }
  }, [isOpen, claim, verificationResults]);

  if (!isOpen) return null;

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `SignalTrace-Debunk-ST-${claimId}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleCopy = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } catch (e) {
      // Fallback
      handleDownload();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#070d19',
          border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.15))',
          borderRadius: '16px',
          width: '900px',
          maxWidth: '96vw',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(244, 63, 94, 0.15)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1rem 1.4rem',
            borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
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
                background: badgeBg,
                border: `1px solid ${badgeBorder}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: badgeColor
              }}
            >
              <Share2 size={16} />
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                Shareable Disaster Debunk Card
              </h2>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)' }}>
                High-contrast social media bulletin for Twitter, Instagram, and WhatsApp Status
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted, #94a3b8)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Canvas Preview Area */}
        <div
          style={{
            padding: '1.25rem',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: '#040711',
            overflowY: 'auto',
            flex: 1
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              maxWidth: '820px',
              height: 'auto',
              borderRadius: '10px',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          />
        </div>

        {/* Action Controls */}
        <div
          style={{
            padding: '0.9rem 1.4rem',
            borderTop: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.01)'
          }}
        >
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #94a3b8)' }}>
            Rendered at 1200×675 px (16:9 HD standard social format)
          </div>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleCopy}
              style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}
            >
              {copied ? <Check size={14} style={{ color: '#34d399' }} /> : <Copy size={14} />}
              <span>{copied ? 'Copied Card!' : 'Copy Image'}</span>
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleDownload}
              style={{
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
                border: 'none',
                color: '#fff'
              }}
            >
              <Download size={14} />
              <span>Download Card (PNG)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebunkCardModal;
