import express from 'express';
import { createDailyEntry, getDailyEntries, getDailyEntryById, updateDailyEntry, deleteDailyEntry } from '../controllers/dailyEntry.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

router.post('/', createDailyEntry);
router.get('/', getDailyEntries);
router.get('/:id', getDailyEntryById);
router.put('/:id', updateDailyEntry);
router.delete('/:id', deleteDailyEntry);

export default router; 