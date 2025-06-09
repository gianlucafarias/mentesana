import { handleError } from '../utils/errors.js';

export const errorHandler = (err, req, res, next) => {
  // Error de Prisma
  if (err.code && err.code.startsWith('P')) {
    if (err.code === 'P2002') {
      err.statusCode = 400;
      err.message = 'Ya existe un registro con ese valor único';
    } else {
      err.statusCode = 400;
      err.message = 'Error en la operación de base de datos';
    }
  }

  // Error de JWT
  if (err.name === 'JsonWebTokenError') {
    err.statusCode = 401;
    err.message = 'Token inválido';
  }

  if (err.name === 'TokenExpiredError') {
    err.statusCode = 401;
    err.message = 'Token expirado';
  }

  // Manejar el error
  handleError(err, res);
}; 