import express from 'express';
import { createEvent, getAllEvents, getEventById, getUpcomingEvents, getPastEvents, updateEvent, deleteEvent } from '../controllers/event.controller.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.middleware.js';
import { publicReadLimiter, writeLimiter, adminLimiter } from '../config/rateLimits.config.js';

const router = express.Router();

// Rutas públicas con rate limiting permisivo
router.get('/', publicReadLimiter, getAllEvents);
router.get('/event/:id', publicReadLimiter, getEventById);
router.get('/upcoming', publicReadLimiter, getUpcomingEvents);
router.get('/past', publicReadLimiter, getPastEvents);

// Rutas protegidas - solo admin con rate limiting estricto
router.post('/', writeLimiter, adminLimiter, authenticateToken, requireAdmin, createEvent);
router.put('/:id', writeLimiter, adminLimiter, authenticateToken, requireAdmin, updateEvent);
router.delete('/:id', writeLimiter, adminLimiter, authenticateToken, requireAdmin, deleteEvent);

export default router; 