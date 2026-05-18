import express from 'express';
import insightController from '../controllers/insight.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Obtener insights del usuario autenticado (generación automática incluida)
router.get('/user/insights', authenticateToken, insightController.getUserInsights);

export default router;
