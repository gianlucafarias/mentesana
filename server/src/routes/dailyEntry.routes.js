import express from 'express';
import { createDailyEntry, getDailyEntries, getDailyEntryById, updateDailyEntry, deleteDailyEntry, canCreateEntryToday, canCreateEntryForDate } from '../controllers/dailyEntry.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { aiLimiter, writeLimiter } from '../config/rateLimits.config.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas con IA - rate limiting estricto (OpenAI es costoso)
router.post('/', aiLimiter, writeLimiter, createDailyEntry);
router.put('/:id', aiLimiter, writeLimiter, updateDailyEntry);

// Rutas de lectura - más permisivas
router.get('/', getDailyEntries);
router.get('/can-create', canCreateEntryToday);
router.get('/date/:date', canCreateEntryForDate); // Nueva ruta para fecha específica
router.get('/:id', getDailyEntryById);

// Eliminación con rate limit de escritura
router.delete('/:id', writeLimiter, deleteDailyEntry);

export default router; 