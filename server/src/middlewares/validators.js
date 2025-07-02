import { body, query, param, validationResult } from 'express-validator';
import AppError from '../utils/errors.js';

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }
  next();
};

// Validadores para Autenticación
export const registerValidator = [
  body('email')
    .isEmail()
    .withMessage('Por favor, introduce un email válido'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres')
    .matches(/\d/)
    .withMessage('La contraseña debe contener al menos un número'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ min: 2 })
    .withMessage('El nombre debe tener al menos 2 caracteres'),
  validate
];

export const loginValidator = [
  body('email')
    .isEmail()
    .withMessage('Por favor, introduce un email válido'),
  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida'),
  validate
];

// Validadores para Blog
export const createPostValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('El título es requerido')
    .isLength({ min: 3, max: 100 })
    .withMessage('El título debe tener entre 3 y 100 caracteres'),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('El contenido es requerido')
    .isLength({ min: 10 })
    .withMessage('El contenido debe tener al menos 10 caracteres'),
  body('published')
    .optional()
    .isBoolean()
    .withMessage('El campo published debe ser un booleano'),
  validate
];

// Validadores para Eventos
export const createEventValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('El título es requerido')
    .isLength({ min: 3, max: 100 })
    .withMessage('El título debe tener entre 3 y 100 caracteres'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('La descripción es requerida')
    .isLength({ min: 10 })
    .withMessage('La descripción debe tener al menos 10 caracteres'),
  body('date')
    .isISO8601()
    .withMessage('La fecha debe estar en formato ISO8601')
    .custom((value) => {
      if (new Date(value) < new Date()) {
        throw new Error('La fecha del evento no puede ser en el pasado');
      }
      return true;
    }),
  body('location')
    .optional()
    .trim()
    .isLength({ min: 3 })
    .withMessage('La ubicación debe tener al menos 3 caracteres'),
  body('eventType')
    .optional()
    .isIn(['PRESENCIAL', 'VIRTUAL', 'HIBRIDO', 'OTRO'])
    .withMessage('El tipo de evento debe ser PRESENCIAL, VIRTUAL, HIBRIDO u OTRO'),
  validate
];

// Validadores para Registro Diario
export const createDailyEntryValidator = [
  body('mood')
    .isInt({ min: 1, max: 5 })
    .withMessage('El estado de ánimo debe ser un número entre 1 y 5'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Las notas no pueden exceder los 500 caracteres'),
  validate
];

// Validadores comunes
export const paginationValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número mayor a 0'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe ser un número entre 1 y 100'),
  validate
];

export const dateRangeValidator = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('La fecha de inicio debe estar en formato ISO8601'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('La fecha de fin debe estar en formato ISO8601')
    .custom((value, { req }) => {
      if (req.query.startDate && new Date(value) < new Date(req.query.startDate)) {
        throw new Error('La fecha de fin no puede ser anterior a la fecha de inicio');
      }
      return true;
    }),
  validate
];

export const idValidator = [
  param('id')
    .notEmpty()
    .withMessage('El ID es requerido')
    .isUUID()
    .withMessage('ID inválido'),
  validate
];

// Validadores para Gestión de Usuarios
export const createUserValidator = [
  body('email')
    .isEmail()
    .withMessage('Por favor, introduce un email válido'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres')
    .matches(/\d/)
    .withMessage('La contraseña debe contener al menos un número'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ min: 2 })
    .withMessage('El nombre debe tener al menos 2 caracteres'),
  body('role')
    .optional()
    .isIn(['USER', 'EDITOR', 'ADMIN'])
    .withMessage('El rol debe ser USER, EDITOR o ADMIN'),
  body('birthDate')
    .optional()
    .isISO8601()
    .withMessage('La fecha de nacimiento debe estar en formato ISO8601'),
  body('locality')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('La localidad debe tener al menos 2 caracteres'),
  body('province')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('La provincia debe tener al menos 2 caracteres'),
  validate
];

export const updateRoleValidator = [
  param('id')
    .notEmpty()
    .withMessage('El ID es requerido')
    .isUUID()
    .withMessage('ID inválido'),
  body('role')
    .notEmpty()
    .withMessage('El rol es requerido')
    .isIn(['USER', 'EDITOR', 'ADMIN'])
    .withMessage('El rol debe ser USER, EDITOR o ADMIN'),
  validate
];

export const updateStatusValidator = [
  param('id')
    .notEmpty()
    .withMessage('El ID es requerido')
    .isUUID()
    .withMessage('ID inválido'),
  body('isActive')
    .notEmpty()
    .withMessage('El estado es requerido')
    .isBoolean()
    .withMessage('El estado debe ser true o false'),
  validate
];

export const userFiltersValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número mayor a 0'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe ser un número entre 1 y 100'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('El término de búsqueda debe tener al menos 1 caracter'),
  query('role')
    .optional()
    .isIn(['USER', 'EDITOR', 'ADMIN'])
    .withMessage('El filtro de rol debe ser USER, EDITOR o ADMIN'),
  query('isActive')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('El filtro de estado debe ser true o false'),
  validate
]; 