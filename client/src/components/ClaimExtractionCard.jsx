import React, { useState, useEffect } from 'react';
import {
  FileText,
  Sparkles,
  Send,
  RefreshCw,
  CheckCircle2,
  Tag,
  MapPin,
  UserCheck,
  AlertTriangle,
  HelpCircle,
  Shield,
  RotateCcw
} from 'lucide-react';
import { extractClaims, verifyClaim, fetchClaimById } from '../services/api';
import VerificationResultCard from './VerificationResultCard';

const SAMPLE_POSTS = [
  {
    label: 'Flood report (Teesta River)',
    text: 'Water levels have crossed danger marks on the Teesta River near Domohani Jalpaiguri. Flood waters are entering farm fields and low villages!'
  },
  {
    label: 'Earthquake report (Chamoli M7.2)',
    text: 'MASSIVE 7.2 Richter earthquake just hit Chamoli Uttarakhand! Entire towns flattened and hundreds feared dead. Please pray!'
  },
  {
    label: 'Evacuation warning (Cyclone)',
    text: 'EVACUATE NOW: Government Red Alert order in place for Paradip coast right now. Cyclone Sagar will hit Paradip directly tonight with 160 kmph winds!'
  },
  {
    label: 'Wildfire report (Shimla Ridge)',
    text: 'Massive forest fire raging through Shimla Ridge pine forests. Several resorts evacuated as smoke covers the valley.'
  },
  {
    label: 'Bridge damage report (Suketi River)',
    text: 'Cloudburst destruction in Mandi: The Suketi highway bridge has collapsed into the river AND the entire district power grid is dead with hospitals in total darkness!'
  },
  {
    label: 'Embankment breach (Kosi River)',
    text: 'Kosi river embankment breach reported in Supaul district. Over 500,000 residents displaced and all road connections severed.'
  },
  {
    label: 'Multi-statement report (Nashik)',
    text: 'Flooding has submerged three villages near Nashik. The main bridge collapsed yesterday, and 200 families have been evacuated.'
  }
];

export const ClaimExtractionCard = ({ selectedClaimId, onClearSelectedClaim, onClaimSubmitted }) => {
  const [inputText, setInputText] = useState('');
  const [sourcePlatform, setSourcePlatform] = useState('web-submission');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoadingClaim, setIsLoadingClaim] = useState(false);
  const [extractedResult, setExtractedResult] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [error, setError] = useState(null);

  // Load claim details if selectedClaimId changes
  useEffect(() => {
    if (!selectedClaimId) return;

    let isCancelled = false;
    setIsLoadingClaim(true);
    setError(null);

    fetchClaimById(selectedClaimId)
      .then((res) => {
        if (isCancelled) return;
        const claim = res.data;
        setInputText(claim.rawText || '');
        setSourcePlatform(claim.sourcePlatform || 'web-submission');
        setExtractedResult(claim);

        // Check if atomic claims have verification statuses
        const hasVerifications = claim.atomicClaims?.some(
          (ac) => ac.verificationStatus && ac.verificationStatus !== 'pending'
        );
        if (hasVerifications) {
          setVerificationResult({
            data: claim,
            meta: {
              verificationResults: claim.atomicClaims.map((ac) => ({
                atomicClaimId: ac.atomicClaimId,
                claimText: ac.text || ac.claimText,
                verificationStatus: ac.verificationStatus,
                explanation: ac.evidenceExplanation || ac.explanation,
                evidenceSummary: ac.evidenceSummary || []
              }))
            }
          });
        } else {
          setVerificationResult(null);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setError(`Failed to load selected claim: ${err.message}`);
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoadingClaim(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedClaimId]);

  const handleReset = () => {
    setInputText('');
    setExtractedResult(null);
    setVerificationResult(null);
    setError(null);
    if (onClearSelectedClaim) {
      onClearSelectedClaim();
    }
  };

  const handleVerifyCurrent = async () => {
    const claimId = extractedResult?._id;
    if (!claimId) return;

    setIsVerifying(true);
    setError(null);
    try {
      const verifyResponse = await verifyClaim(claimId);
      setVerificationResult(verifyResponse);
      setExtractedResult(verifyResponse.data);
      onClaimSubmitted?.(verifyResponse.data);
    } catch (err) {
      setError(err.message || 'Verification failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    setIsSubmitting(true);
    setError(null);
    setExtractedResult(null);
    setVerificationResult(null);

    try {
      // Step 1: Extract atomic claims
      const extractResponse = await extractClaims({
        text: inputText.trim(),
        sourcePlatform
      });

      const claimData = extractResponse.data;
      setExtractedResult(claimData);

      // Step 2: Auto-run deterministic verification on the persisted claim
      if (claimData?._id) {
        setIsVerifying(true);
        try {
          const verifyResponse = await verifyClaim(claimData._id);
          setVerificationResult(verifyResponse);
          setExtractedResult(verifyResponse.data);
          onClaimSubmitted?.(verifyResponse.data);
        } catch (verifyErr) {
          // Verification failure is non-fatal — extraction result still shown
          console.warn('[Verification] Engine error:', verifyErr.message);
          onClaimSubmitted?.(claimData);
        } finally {
          setIsVerifying(false);
        }
      } else {
        onClaimSubmitted?.(claimData);
      }
    } catch (err) {
      setError(err.message || 'Failed to extract claims from server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUseSample = (sampleText) => {
    if (selectedClaimId && onClearSelectedClaim) {
      onClearSelectedClaim();
    }
    setInputText(sampleText);
    setError(null);
    setExtractedResult(null);
    setVerificationResult(null);
  };

  const isLoading = isSubmitting || isVerifying || isLoadingClaim;
  const isViewingStored = Boolean(selectedClaimId && extractedResult?._id === selectedClaimId);
  const hasPendingClaims = extractedResult?.atomicClaims?.some(
    (ac) => !ac.verificationStatus || ac.verificationStatus === 'pending'
  );

  return (
    <div className="card" style={{ marginTop: '0' }}>
      <div className="card-header">
        <div className="card-title-group">
          <div className="card-icon" style={{ background: 'rgba(56, 189, 248, 0.1)' }}>
            <FileText size={20} style={{ color: 'var(--accent-cyan)' }} />
          </div>
          <div>
            <h2 className="card-title">Check a Disaster Report</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Paste an unverified crisis report or message to cross-reference with official emergency alerts
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isViewingStored && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleReset}
              style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
              title="Clear selected report and enter a new one"
            >
              <RotateCcw size={12} />
              <span>New Report</span>
            </button>
          )}
        </div>
      </div>

      {/* Selected Report Banner */}
      {isViewingStored && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            padding: '0.65rem 0.9rem',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            fontSize: '0.8rem',
            color: 'var(--text-primary)',
            marginBottom: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={16} style={{ color: 'var(--accent-cyan)' }} />
            <span>
              Inspecting saved report <strong>#{extractedResult?._id?.slice(-8)}</strong>
              {' · '}
              <span style={{ color: 'var(--text-muted)' }}>
                {extractedResult?.createdAt ? new Date(extractedResult.createdAt).toLocaleString() : ''}
              </span>
            </span>
          </div>
          {hasPendingClaims && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleVerifyCurrent}
              disabled={isVerifying}
              style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}
            >
              {isVerifying ? <RefreshCw size={12} className="animate-spin" /> : <Shield size={12} />}
              <span>Check Report</span>
            </button>
          )}
        </div>
      )}

      {/* Verification Notice */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.65rem',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(56, 189, 248, 0.04)',
          border: '1px solid rgba(56, 189, 248, 0.15)',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          marginBottom: '1.25rem'
        }}
      >
        <HelpCircle size={16} style={{ color: 'var(--accent-cyan)', flexShrink: 0, marginTop: '2px' }} />
        <span>
          <strong>How Verification Works:</strong> Reports are broken down into individual statements and cross-referenced with emergency bulletins from official disaster management and geological agencies. Verifications are evidence-grounded, not generated by conversational AI.
        </span>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <label htmlFor="claim-text-input" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Paste a disaster report
            </label>
            <span style={{ fontSize: '0.75rem', color: inputText.length > 2000 ? 'var(--accent-rose)' : 'var(--text-muted)' }}>
              {inputText.length} / 2000 chars
            </span>
          </div>
          <textarea
            id="claim-text-input"
            rows={4}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste or type an unverified disaster post, forward, or emergency message here..."
            style={{
              width: '100%',
              padding: '0.85rem',
              borderRadius: 'var(--radius-md)',
              background: '#090e1b',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontFamily: 'inherit',
              fontSize: '0.9rem',
              resize: 'vertical',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            disabled={isLoading}
          />
        </div>

        {/* Quick Sample Selector */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginBottom: '1.25rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Try an Example:</span>
          {SAMPLE_POSTS.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              className="btn btn-outline"
              onClick={() => handleUseSample(sample.text)}
              style={{ padding: '0.22rem 0.55rem', fontSize: '0.72rem' }}
            >
              <Sparkles size={11} />
              <span>{sample.label}</span>
            </button>
          ))}
        </div>

        {/* Options Row & Submit Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label htmlFor="source-platform-select" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Platform:
            </label>
            <select
              id="source-platform-select"
              value={sourcePlatform}
              onChange={(e) => setSourcePlatform(e.target.value)}
              style={{
                background: '#090e1b',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.35rem 0.65rem',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            >
              <option value="web-submission">Web Submission</option>
              <option value="twitter">Twitter / X</option>
              <option value="telegram">Telegram</option>
              <option value="whatsapp">WhatsApp Forward</option>
              <option value="news">Local News</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {inputText && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleReset}
                disabled={isLoading}
                style={{ padding: '0.5rem 0.9rem', fontSize: '0.8rem' }}
              >
                Clear
              </button>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              id="extract-verify-btn"
              disabled={isLoading || !inputText.trim() || inputText.length > 2000}
              style={{ padding: '0.55rem 1.25rem' }}
            >
              {isSubmitting || isVerifying ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Checking Report...</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>Check Report</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Error State */}
      {error && (
        <div className="alert-error" style={{ marginTop: '1.25rem' }}>
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {/* Identified Statements Output */}
      {extractedResult && (
        <div style={{ marginTop: '1.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={16} style={{ color: 'var(--accent-emerald)' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Identified Statements ({extractedResult.atomicClaims?.length || 0})
              </h3>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              ID: {extractedResult._id?.slice(-12)}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {extractedResult.atomicClaims?.map((claim, index) => (
              <div
                key={claim.atomicClaimId || index}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '0.15rem 0.45rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(56, 189, 248, 0.12)',
                      color: 'var(--accent-cyan)'
                    }}>
                      STATEMENT #{index + 1}
                    </span>
                    <span style={{
                      fontSize: '0.72rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      padding: '0.15rem 0.45rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--text-secondary)'
                    }}>
                      {claim.claimType || 'statement'}
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  "{claim.text || claim.claimText}"
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.1rem' }}>
                  {claim.location?.city && (
                    <span className="metric-label" style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '4px' }}>
                      <MapPin size={11} /> {claim.location.city}
                    </span>
                  )}
                  {claim.attribution && (
                    <span className="metric-label" style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '4px' }}>
                      <UserCheck size={11} /> {claim.attribution}
                    </span>
                  )}
                  {claim.uncertainty?.isUncertain && (
                    <span className="metric-label" style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-amber)', borderRadius: '4px' }}>
                      <AlertTriangle size={11} /> Qualified
                    </span>
                  )}
                  {claim.entities?.map((ent, eIdx) => (
                    <span key={eIdx} className="metric-label" style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '4px' }}>
                      <Tag size={11} /> {ent.name} ({ent.category})
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verification Results */}
      {verificationResult && (
        <VerificationResultCard
          claimId={extractedResult?._id}
          verificationResults={verificationResult.meta?.verificationResults}
          claimData={verificationResult.data || extractedResult}
        />
      )}
    </div>
  );
};

export default ClaimExtractionCard;
