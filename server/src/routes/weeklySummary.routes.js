import express from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { aiLimiter } from '../config/rateLimits.config.js';
import { getCurrentWeeklySummary } from '../controllers/weeklySummary.controller.js';

const router = express.Router();

router.get('/current', authenticateToken, aiLimiter, getCurrentWeeklySummary);

export default router;
