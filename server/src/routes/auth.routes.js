import express from 'express';
import { register, login, getProfile, updateProfile } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { registerValidator, loginValidator } from '../middlewares/validators.js';

const router = express.Router();

router.post('/register', registerValidator, register);
router.post('/login', loginValidator, login);
router.get('/profile', authenticateToken, getProfile);
router.put('/edit-profile', authenticateToken, updateProfile);

export default router; 