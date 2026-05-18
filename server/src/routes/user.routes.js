import express from 'express';
import { 
  getAllUsers, 
  getUserById, 
  updateUserRole, 
  updateUserStatus, 
  deleteUser, 
  getUsersStats,
  createUser 
} from '../controllers/user.controller.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.middleware.js';
import { 
  createUserValidator,
  updateRoleValidator,
  updateStatusValidator,
  userFiltersValidator,
  idValidator
} from '../middlewares/validators.js';

const router = express.Router();

// Todas las rutas requieren autenticación y privilegios de admin
router.use(authenticateToken);
router.use(requireAdmin);

// Obtener todos los usuarios con filtros y paginación
router.get('/', userFiltersValidator, getAllUsers);

// Obtener estadísticas generales de usuarios
router.get('/stats', getUsersStats);

// Obtener usuario específico con estadísticas detalladas
router.get('/:id', idValidator, getUserById);

// Crear nuevo usuario
router.post('/', createUserValidator, createUser);

// Actualizar rol de usuario
router.put('/:id/role', updateRoleValidator, updateUserRole);

// Activar/desactivar usuario
router.put('/:id/status', updateStatusValidator, updateUserStatus);

// Eliminar usuario
router.delete('/:id', idValidator, deleteUser);

export default router; 