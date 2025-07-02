import express from 'express';
import { createPost, getAllPosts, getPostById, updatePost, deletePost } from '../controllers/blog.controller.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.middleware.js';
import { publicReadLimiter, writeLimiter, adminLimiter } from '../config/rateLimits.config.js';

const router = express.Router();

// Rutas públicas con rate limiting permisivo
router.get('/', publicReadLimiter, getAllPosts);
router.get('/:id', publicReadLimiter, getPostById);

// Rutas protegidas - solo admin con rate limiting estricto
router.post('/', writeLimiter, adminLimiter, authenticateToken, requireAdmin, createPost);
router.put('/:id', writeLimiter, adminLimiter, authenticateToken, requireAdmin, updatePost);
router.delete('/:id', writeLimiter, adminLimiter, authenticateToken, requireAdmin, deletePost);

export default router; 