import express from 'express';
import { createDailyEntry, getDailyEntries, getDailyEntryById, updateDailyEntry, deleteDailyEntry, canCreateEntryToday, canCreateEntryForDate } from '../controllers/dailyEntry.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { aiLimiter, writeLimiter } from '../config/rateLimits.config.js';
import { createDailyEntryValidator, updateDailyEntryValidator, idValidator, dateParamValidator } from '../middlewares/validators.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas con IA - rate limiting estricto (OpenAI es costoso)
router.post('/', aiLimiter, writeLimiter, createDailyEntryValidator, createDailyEntry);
router.put('/:id', aiLimiter, writeLimiter, idValidator, updateDailyEntryValidator, updateDailyEntry);

// Rutas de lectura - más permisivas
router.get('/', getDailyEntries);
router.get('/can-create', canCreateEntryToday);
router.get('/date/:date', dateParamValidator, canCreateEntryForDate);
router.get('/:id', idValidator, getDailyEntryById);

// Eliminación con rate limit de escritura
router.delete('/:id', writeLimiter, idValidator, deleteDailyEntry);

export default router; 
