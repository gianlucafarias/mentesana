import express from 'express';
import { createPost, getAllPosts, getPostById, updatePost, deletePost } from '../controllers/blog.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Rutas públicas
router.get('/', getAllPosts);
router.get('/:id', getPostById);

// Rutas protegidas
router.post('/', authenticateToken, createPost);
router.put('/:id', authenticateToken, updatePost);
router.delete('/:id', authenticateToken, deletePost);

export default router; 