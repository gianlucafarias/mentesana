import { prisma } from '../../index.js';
import bcrypt from 'bcrypt';

// Obtener todos los usuarios (solo admin)
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = '', isActive = '' } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Construir filtros
    const where = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { locality: { contains: search, mode: 'insensitive' } },
        { province: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (role && role !== '') {
      where.role = role;
    }
    
    if (isActive !== '') {
      where.isActive = isActive === 'true';
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          email: true,
          name: true,
          birthDate: true,
          locality: true,
          province: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              posts: true,
              events: true,
              dailyEntries: true,
              notifications: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    const totalPages = Math.ceil(total / take);

    res.json({
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalUsers: total,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
};

// Obtener usuario específico con estadísticas detalladas
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        birthDate: true,
        locality: true,
        province: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        posts: {
          select: {
            id: true,
            title: true,
            published: true,
            createdAt: true,
            category: true
          },
          orderBy: { createdAt: 'desc' }
        },
        events: {
          select: {
            id: true,
            title: true,
            date: true,
            createdAt: true,
            location: true
          },
          orderBy: { createdAt: 'desc' }
        },
        dailyEntries: {
          select: {
            id: true,
            mood: true,
            date: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 30 // Últimos 30 registros
        },
        _count: {
          select: {
            posts: true,
            events: true,
            dailyEntries: true,
            notifications: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Calcular estadísticas adicionales
    const stats = {
      totalActivity: user._count.posts + user._count.events + user._count.dailyEntries,
      averageMood: user.dailyEntries.length > 0 
        ? user.dailyEntries.reduce((sum, entry) => sum + entry.mood, 0) / user.dailyEntries.length 
        : 0,
      daysSinceLastEntry: user.dailyEntries.length > 0
        ? Math.floor((new Date() - new Date(user.dailyEntries[0].createdAt)) / (1000 * 60 * 60 * 24))
        : null,
      daysSinceLastLogin: user.lastLogin
        ? Math.floor((new Date() - new Date(user.lastLogin)) / (1000 * 60 * 60 * 24))
        : null,
      hasNeverLoggedIn: !user.lastLogin,
      accountAge: Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24))
    };

    res.json({ user, stats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener usuario' });
  }
};

// Actualizar rol de usuario
export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['USER', 'EDITOR', 'ADMIN'].includes(role)) {
      return res.status(400).json({ message: 'Rol inválido' });
    }

    // Verificar que el usuario no esté tratando de cambiar su propio rol
    if (id === req.user.id) {
      return res.status(400).json({ message: 'No puedes cambiar tu propio rol' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLogin: true,
        updatedAt: true
      }
    });

    res.json({ 
      message: 'Rol actualizado correctamente', 
      user 
    });
  } catch (error) {
    console.error(error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.status(500).json({ message: 'Error al actualizar rol' });
  }
};

// Activar/desactivar usuario
export const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: 'El estado debe ser un valor booleano' });
    }

    // Verificar que el usuario no esté tratando de desactivar su propia cuenta
    if (id === req.user.id) {
      return res.status(400).json({ message: 'No puedes desactivar tu propia cuenta' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLogin: true,
        updatedAt: true
      }
    });

    res.json({ 
      message: `Usuario ${isActive ? 'activado' : 'desactivado'} correctamente`, 
      user 
    });
  } catch (error) {
    console.error(error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.status(500).json({ message: 'Error al actualizar estado del usuario' });
  }
};

// Eliminar usuario (opcional - soft delete manteniendo registros relacionados)
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el usuario no esté tratando de eliminar su propia cuenta
    if (id === req.user.id) {
      return res.status(400).json({ message: 'No puedes eliminar tu propia cuenta' });
    }

    // Verificar si el usuario existe
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true }
    });

    if (!existingUser) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Eliminar usuario (esto también eliminará registros relacionados debido a las relaciones)
    await prisma.user.delete({
      where: { id }
    });

    res.json({ 
      message: 'Usuario eliminado correctamente',
      deletedUser: existingUser
    });
  } catch (error) {
    console.error(error);
    if (error.code === 'P2003') {
      return res.status(400).json({ 
        message: 'No se puede eliminar el usuario porque tiene registros relacionados' 
      });
    }
    res.status(500).json({ message: 'Error al eliminar usuario' });
  }
};

// Obtener estadísticas generales de usuarios
export const getUsersStats = async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      usersByRole,
      recentUsers,
      usersWithActivity,
      usersNeverLoggedIn,
      usersInactiveLastWeek,
      usersInactiveLastMonth
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.groupBy({
        by: ['role'],
        _count: { role: true }
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Últimos 7 días
          }
        }
      }),
      prisma.user.count({
        where: {
          OR: [
            { posts: { some: {} } },
            { events: { some: {} } },
            { dailyEntries: { some: {} } }
          ]
        }
      }),
      prisma.user.count({
        where: { lastLogin: null }
      }),
      prisma.user.count({
        where: {
          lastLogin: {
            lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // No login en 7 días
          }
        }
      }),
      prisma.user.count({
        where: {
          lastLogin: {
            lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // No login en 30 días
          }
        }
      })
    ]);

    const roleStats = usersByRole.reduce((acc, item) => {
      acc[item.role] = item._count.role;
      return acc;
    }, {});

    res.json({
      total: totalUsers,
      active: activeUsers,
      inactive: totalUsers - activeUsers,
      newThisWeek: recentUsers,
      withActivity: usersWithActivity,
      roleDistribution: roleStats,
      loginStats: {
        neverLoggedIn: usersNeverLoggedIn,
        inactiveLastWeek: usersInactiveLastWeek,
        inactiveLastMonth: usersInactiveLastMonth,
        activeLastWeek: totalUsers - usersInactiveLastWeek - usersNeverLoggedIn
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener estadísticas de usuarios' });
  }
};

// Crear nuevo usuario (desde admin)
export const createUser = async (req, res) => {
  try {
    const { email, password, name, birthDate, locality, province, role = 'USER' } = req.body;

    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'El email ya está registrado' });
    }

    if (!['USER', 'EDITOR', 'ADMIN'].includes(role)) {
      return res.status(400).json({ message: 'Rol inválido' });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Preparar datos para crear usuario
    const userData = {
      email,
      password: hashedPassword,
      name,
      role
    };

    // Agregar campos opcionales si están presentes
    if (birthDate) userData.birthDate = new Date(birthDate);
    if (locality) userData.locality = locality;
    if (province) userData.province = province;

    // Crear usuario
    const user = await prisma.user.create({
      data: userData,
      select: {
        id: true,
        email: true,
        name: true,
        birthDate: true,
        locality: true,
        province: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true
      }
    });

    res.status(201).json({ 
      message: 'Usuario creado correctamente',
      user 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al crear usuario' });
  }
}; 