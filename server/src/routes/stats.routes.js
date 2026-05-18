import express from 'express';
import { 
  getGeneralStats, 
  getDailyEntriesPerDay, 
  getDailyEntriesPerMonth, 
  getCompleteStats,
  getUserStatsByRole 
} from '../controllers/stats.controller.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.middleware.js';
import { adminLimiter } from '../config/rateLimits.config.js';

const router = express.Router();

// Todas las rutas de estadísticas requieren autenticación y privilegios de admin
router.use(authenticateToken, requireAdmin);

// Rate limiting para todas las estadísticas (operaciones costosas)
router.use(adminLimiter);

// Estadísticas generales
router.get('/general', getGeneralStats);

// Estadísticas de daily entries
router.get('/daily-entries/daily', getDailyEntriesPerDay);
router.get('/daily-entries/monthly', getDailyEntriesPerMonth);

// Estadísticas de usuarios
router.get('/users/by-role', getUserStatsByRole);

// Estadísticas completas (endpoint combinado)
router.get('/complete', getCompleteStats);

export default router; 