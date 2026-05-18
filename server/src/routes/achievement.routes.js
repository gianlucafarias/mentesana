import express from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { writeLimiter } from '../config/rateLimits.config.js';
import {
  getAchievements,
  getAchievementsSummary,
  registerAchievementEvent,
} from '../controllers/achievement.controller.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/achievements', getAchievements);
router.get('/achievements/summary', getAchievementsSummary);
router.post('/achievements/events', writeLimiter, registerAchievementEvent);

export default router;
