import express from 'express';
import { createEvent, getAllEvents, getEventById, getUpcomingEvents, getPastEvents, updateEvent, deleteEvent } from '../controllers/event.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Rutas públicas
router.get('/', getAllEvents);
router.get('/event/:id', getEventById);
router.get('/upcoming', getUpcomingEvents);
router.get('/past', getPastEvents);

// Rutas protegidas
router.post('/', authenticateToken, createEvent);
router.put('/:id', authenticateToken, updateEvent);
router.delete('/:id', authenticateToken, deleteEvent);

export default router; 