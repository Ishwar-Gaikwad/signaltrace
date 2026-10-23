import mongoose from 'mongoose';
import { Claim } from '../models/index.js';
import { getPaginatedClaims, getClaimById } from '../services/claim.service.js';
import {
  extractAtomicClaims,
  validateInputText
} from '../services/extraction/claimExtraction.service.js';
import { verifyClaimAtomics } from '../services/verification/verificationEngine.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

/**
 * Controller to handle GET /api/claims
 * Returns a paginated list of claims with metadata
 */
export const listClaims = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, verdict } = req.query;
    const { claims, meta } = await getPaginatedClaims({ page, limit, status, verdict });

    return successResponse(res, claims, 'Claims retrieved successfully', 200, meta);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle GET /api/claims/:id
 * Returns a single claim with its associated evidence
 */
export const getClaim = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(
        res,
        `Invalid claim ID format: '${id}'. Must be a valid 24-character hexadecimal ObjectId.`,
        400,
        'INVALID_IDENTIFIER'
      );
    }

    const claim = await getClaimById(id);
    return successResponse(res, claim, 'Claim retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle POST /api/claims/extract
 * Ingests a raw disaster-related post, extracts discrete atomic claims,
 * persists the claim record, and returns the structured result.
 */
export const extractClaim = async (req, res, next) => {
  let createdClaim = null;
  try {
    const {
      text,
      sourcePlatform = 'web-submission',
      authorId = null,
      authorDisplayName = null,
      publishedAt = null,
      claimedLocation = null,
      mediaAttachments = []
    } = req.body || {};

    // 1. Validate and normalize incoming text
    const validatedText = validateInputText(text);

    // 2. Create parent Claim record with initial processing status
    createdClaim = await Claim.create({
      originalText: validatedText,
      // Demo provenance is explicit and only set by the application's demo preset marker.
      isSynthetic: typeof sourcePlatform === 'string' && sourcePlatform.trim().toLowerCase() === 'synthetic-demo',
      sourcePlatform:
        typeof sourcePlatform === 'string' && sourcePlatform.trim()
          ? sourcePlatform.trim().toLowerCase()
          : 'web-submission',
      authorId: typeof authorId === 'string' && authorId.trim() ? authorId.trim() : null,
      authorDisplayName:
        typeof authorDisplayName === 'string' && authorDisplayName.trim()
          ? authorDisplayName.trim()
          : null,
      publishedAt: publishedAt ? new Date(publishedAt) : null,
      claimedLocation: claimedLocation && typeof claimedLocation === 'object' ? claimedLocation : null,
      mediaAttachments: Array.isArray(mediaAttachments) ? mediaAttachments : [],
      processingStatus: 'processing',
      atomicClaims: []
    });

    // 3. Run atomic claim extraction
    const { claims, method } = await extractAtomicClaims(validatedText);

    // 4. Update claim record with extracted atomic claims
    createdClaim.atomicClaims = claims;
    createdClaim.processingStatus = 'completed';
    await createdClaim.save();

    // 5. Return standardized 201 Created JSON response
    return successResponse(
      res,
      createdClaim,
      'Atomic claims extracted successfully',
      201,
      {
        extractedClaimCount: claims.length,
        extractionMethod: method
      }
    );
  } catch (error) {
    // If a record was created before failure, mark as failed so partial state is not reported as success
    if (createdClaim) {
      try {
        createdClaim.processingStatus = 'failed';
        await createdClaim.save();
      } catch (updateError) {
        console.error('Failed to update claim processingStatus to failed:', updateError.message);
      }
    }
    next(error);
  }
};

/**
 * Controller to handle POST /api/claims/:id/verify
 * Runs the deterministic verification engine on all atomic claims of a persisted Claim record.
 * Writes verificationStatus, verificationExplanation, and linkedEvidenceIds into each AtomicClaim sub-document.
 */
export const verifyClaim = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(
        res,
        `Invalid claim ID format: '${id}'. Must be a valid 24-character hexadecimal ObjectId.`,
        400,
        'INVALID_IDENTIFIER'
      );
    }

    // Fetch the full Mongoose document (NOT lean) so we can mutate and save sub-documents
    const claimDoc = await Claim.findById(id);
    if (!claimDoc) {
      return errorResponse(res, `Claim with ID '${id}' not found.`, 404, 'RESOURCE_NOT_FOUND');
    }

    if (claimDoc.atomicClaims.length === 0) {
      return errorResponse(
        res,
        'This claim has no atomic claims to verify. Run extraction first via POST /api/claims/extract.',
        422,
        'NO_ATOMIC_CLAIMS'
      );
    }

    // Run deterministic verification engine (updates DB via updateOne)
    const verificationSummary = await verifyClaimAtomics(claimDoc);

    // Reload the updated claim from DB so the response contains the persisted verdicts
    const updatedClaim = await Claim.findById(id).lean();

    return successResponse(
      res,
      updatedClaim,
      'Claim verification completed successfully',
      200,
      {
        atomicClaimCount: verificationSummary.atomicClaimCount,
        verificationResults: verificationSummary.verificationResults
      }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle POST /api/claims/citizen-bot
 * Citizen WhatsApp / SMS helpline simulation.
 * Ingests forwarded message, runs extraction & deterministic verification,
 * and formats a low-bandwidth, conversational emergency response.
 */
export const citizenBotHandler = async (req, res, next) => {
  try {
    const { message, channel = 'whatsapp' } = req.body || {};

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return errorResponse(
        res,
        'Missing or empty message. Please provide a disaster claim or forwarded text.',
        400,
        'VALIDATION_ERROR'
      );
    }

    const validatedText = validateInputText(message);
    const normalizedChannel = channel === 'sms' ? 'sms' : 'whatsapp';

    // 1. Create Claim record
    const createdClaim = await Claim.create({
      originalText: validatedText,
      sourcePlatform: normalizedChannel === 'sms' ? 'citizen-sms-hotline' : 'citizen-whatsapp-hotline',
      processingStatus: 'processing',
      atomicClaims: []
    });

    // 2. Extract atomic claims
    const { claims } = await extractAtomicClaims(validatedText);
    createdClaim.atomicClaims = claims;
    createdClaim.processingStatus = 'completed';
    await createdClaim.save();

    // 3. Verify using deterministic engine + corroboration matcher
    const verificationSummary = await verifyClaimAtomics(createdClaim);

    const results = verificationSummary.verificationResults || [];
    const hasConflicting = results.some((r) => r.verificationStatus === 'Conflicting');
    const hasOutdated = results.some((r) => r.verificationStatus === 'Outdated');
    const hasVerified = results.some((r) => r.verificationStatus === 'Verified');

    let overallStatus = 'Unverified';
    let statusHeader = '⚪ UNVERIFIED / PROCEED WITH CAUTION';
    let advice = 'No authoritative government report confirms this claim yet. Avoid sharing unverified forwarded messages.';

    if (hasConflicting) {
      overallStatus = 'Conflicting';
      statusHeader = '🔴 MISINFORMATION DETECTED / DO NOT FORWARD';
      advice = 'Official disaster authorities contradict this message. Do NOT forward this to family groups or social media.';
    } else if (hasOutdated) {
      overallStatus = 'Outdated';
      statusHeader = '🟡 SUPERSEDED / OUTDATED ALERT';
      advice = 'This message contains superseded emergency info. Newer bulletins have since been issued by authorities.';
    } else if (hasVerified) {
      overallStatus = 'Verified';
      statusHeader = '🟢 OFFICIAL DISASTER BULLETIN VERIFIED';
      advice = 'This emergency report aligns with verified disaster bulletins. Follow local district administration evacuation instructions.';
    }

    // Format low-bandwidth conversational text
    const shortId = createdClaim._id.toString().slice(-6).toUpperCase();
    const timestampStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let replyLines = [];
    if (normalizedChannel === 'whatsapp') {
      replyLines.push(`🚨 *SIGNALTRACE DISASTER HELPLINE* (Ref: #ST-${shortId})`);
      replyLines.push(`⏱️ *Checked at:* ${timestampStr}`);
      replyLines.push(``);
      replyLines.push(`*STATUS: ${statusHeader}*`);
      replyLines.push(``);
      replyLines.push(`📋 *FACT-CHECK BREAKDOWN:*`);

      results.forEach((item, idx) => {
        const icon =
          item.verificationStatus === 'Verified'
            ? '✅'
            : item.verificationStatus === 'Conflicting'
            ? '❌'
            : item.verificationStatus === 'Outdated'
            ? '⚠️'
            : '❔';
        replyLines.push(`${icon} *Claim ${idx + 1}:* "${item.claimText}"`);
        replyLines.push(`   └ *Verdict:* ${item.verificationStatus}`);
        if (item.explanation) {
          replyLines.push(`   └ *Details:* ${item.explanation}`);
        }
      });

      replyLines.push(``);
      replyLines.push(`⚠️ *CITIZEN ADVISORY:*`);
      replyLines.push(advice);
      replyLines.push(``);
      replyLines.push(`📞 *EMERGENCY NUMBERS:*`);
      replyLines.push(`• National Emergency: 112`);
      replyLines.push(`• Disaster Management (NDMA): 1078`);
      replyLines.push(`• Ambulance / Medical: 108`);
    } else {
      // SMS: ultra compact text (<300 chars)
      replyLines.push(`[SignalTrace Alert ST-${shortId}]`);
      replyLines.push(`STATUS: ${overallStatus.toUpperCase()}`);
      replyLines.push(`FACTS: ${results.map((r, i) => `#${i + 1}:${r.verificationStatus}`).join(', ')}`);
      replyLines.push(`ADVICE: ${advice}`);
      replyLines.push(`HELP: Call 112 or NDMA 1078`);
    }

    const formattedReply = replyLines.join('\n');

    return successResponse(
      res,
      {
        claimId: createdClaim._id,
        channel: normalizedChannel,
        overallStatus,
        botReply: formattedReply,
        atomicResults: results,
        timestamp: new Date().toISOString()
      },
      'Citizen bot verification completed',
      200
    );
  } catch (error) {
    next(error);
  }
};

