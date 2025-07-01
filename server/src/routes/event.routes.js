import express from 'express';
import { createEvent, getAllEvents, getEventById, getUpcomingEvents, getPastEvents, updateEvent, deleteEvent } from '../controllers/event.controller.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Rutas públicas
router.get('/', getAllEvents);
router.get('/event/:id', getEventById);
router.get('/upcoming', getUpcomingEvents);
router.get('/past', getPastEvents);

// Rutas protegidas - solo admin puede crear, editar y eliminar eventos
router.post('/', authenticateToken, requireAdmin, createEvent);
router.put('/:id', authenticateToken, requireAdmin, updateEvent);
router.delete('/:id', authenticateToken, requireAdmin, deleteEvent);

export default router; 