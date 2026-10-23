import { Router } from 'express';
import { listClaims, getClaim, extractClaim, verifyClaim } from '../controllers/claim.controller.js';

const router = Router();

/**
 * @route   POST /api/claims/extract
 * @desc    Decompose a disaster post into discrete atomic claims and persist
 * @access  Public
 */
router.post('/claims/extract', extractClaim);

/**
 * @route   POST /api/claims/:id/verify
 * @desc    Run deterministic verification engine on all atomic claims of a persisted claim
 * @access  Public
 */
router.post('/claims/:id/verify', verifyClaim);

/**
 * @route   GET /api/claims
 * @desc    Get paginated list of claims
 * @access  Public
 */
router.get('/claims', listClaims);

/**
 * @route   GET /api/claims/:id
 * @desc    Get single claim with associated evidence
 * @access  Public
 */
router.get('/claims/:id', getClaim);

export default router;
