import express from 'express';
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification } from '../controllers/notification.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { writeLimiter } from '../config/rateLimits.config.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas de lectura (sin rate limiting adicional)
router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);

// Rutas de escritura con rate limiting
router.put('/:id/read', writeLimiter, markAsRead);
router.put('/mark-all-read', writeLimiter, markAllAsRead);
router.delete('/:id', writeLimiter, deleteNotification);

export default router; 