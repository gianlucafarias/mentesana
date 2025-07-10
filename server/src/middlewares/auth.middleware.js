import jwt from 'jsonwebtoken';
import { prisma } from '../config/database.js';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verificar que el usuario siga existiendo y esté activo
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true, isActive: true }
    });

    if (!user) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Cuenta desactivada. Contacta al administrador' });
    }

    req.user = { id: user.id, role: user.role };
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Token inválido' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Usuario no autenticado' });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Acceso denegado. Se requieren privilegios de administrador' });
  }

  next();
}; 