import express from 'express';
import { register, login, getProfile, updateProfile } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { registerValidator, loginValidator } from '../middlewares/validators.js';
import { authLimiter, authSlowDown, registerLimiter } from '../config/rateLimits.config.js';

const router = express.Router();

// Rutas con rate limiting específico
router.post('/register', registerLimiter, registerValidator, register);
router.post('/login', authSlowDown, authLimiter, loginValidator, login);
router.get('/profile', authenticateToken, getProfile);
router.put('/edit-profile', authenticateToken, updateProfile);

export default router; 