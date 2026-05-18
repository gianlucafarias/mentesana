import express from 'express';
import { uploadImage, deleteImage, getImageInfo } from '../controllers/upload.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { uploadConfig, handleUploadError } from '../config/upload.config.js';
import { writeLimiter } from '../config/rateLimits.config.js';

const router = express.Router();

// Rate limiter específico para uploads (más restrictivo)
import rateLimit from 'express-rate-limit';

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: process.env.NODE_ENV === 'development' ? 50 : 10, // Dev: 50 uploads/hora, Prod: 10 uploads/hora
  message: {
    error: 'Límite de uploads alcanzado',
    message: 'Demasiadas cargas de imágenes. Intenta en 1 hora.',
    retryAfter: 60 * 60
  },
  standardHeaders: true,
  keyGenerator: (req) => {
    // Limitar por usuario autenticado
    return req.user?.id || req.ip;
  }
});

// POST /api/upload/image - Subir una imagen
router.post('/image', 
  writeLimiter,           // Rate limit general de escritura
  uploadLimiter,          // Rate limit específico para uploads
  authenticateToken,      // Requiere autenticación
  uploadConfig.single('image'), // Multer para manejo del archivo
  handleUploadError,      // Manejo de errores de multer
  uploadImage             // Controlador
);

// DELETE /api/upload/image/:filename - Eliminar una imagen
router.delete('/image/:filename',
  writeLimiter,
  authenticateToken,
  deleteImage
);

// GET /api/upload/image/:filename/info - Obtener información de una imagen
router.get('/image/:filename/info',
  authenticateToken,
  getImageInfo
);

export default router; 