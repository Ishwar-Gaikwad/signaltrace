import { Router } from 'express';
import { listIncidents } from '../controllers/incident.controller.js';

const router = Router();

/**
 * @route   GET /api/incidents
 * @desc    Get paginated list of incident reports
 * @access  Public
 */
router.get('/incidents', listIncidents);

export default router;
