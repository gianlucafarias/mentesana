import express from 'express';
import { createPost, getAllPosts, getPostById, updatePost, deletePost } from '../controllers/blog.controller.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Rutas públicas
router.get('/', getAllPosts);
router.get('/:id', getPostById);

// Rutas protegidas - solo admin puede crear, editar y eliminar posts
router.post('/', authenticateToken, requireAdmin, createPost);
router.put('/:id', authenticateToken, requireAdmin, updatePost);
router.delete('/:id', authenticateToken, requireAdmin, deletePost);

export default router; 