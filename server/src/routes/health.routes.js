import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';

const router = Router();

/**
 * @route   GET /api/health
 * @desc    Get API operational health, uptime, timestamp, and database status
 * @access  Public
 */
router.get('/health', getHealth);

export default router;
