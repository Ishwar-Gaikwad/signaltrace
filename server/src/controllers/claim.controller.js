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
      claimedLocation = null
    } = req.body || {};

    // 1. Validate and normalize incoming text
    const validatedText = validateInputText(text);

    // 2. Create parent Claim record with initial processing status
    createdClaim = await Claim.create({
      originalText: validatedText,
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
