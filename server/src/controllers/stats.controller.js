import { prisma } from '../config/database.js';

// Obtener estadísticas generales
export const getGeneralStats = async (req, res) => {
  try {
    // Ejecutar todas las consultas en paralelo para mejor performance
    const [
      totalUsers,
      totalPublishedPosts,
      totalEvents,
      totalDailyEntries
    ] = await Promise.all([
      prisma.user.count(),
      prisma.post.count({
        where: { published: true }
      }),
      prisma.event.count(),
      prisma.dailyEntry.count()
    ]);

    res.json({
      totalUsers,
      totalPublishedPosts,
      totalEvents,
      totalDailyEntries
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener estadísticas generales' });
  }
};

// Obtener estadísticas de Daily Entries por día (últimos 30 días)
export const getDailyEntriesPerDay = async (req, res) => {
  try {
    // Fecha hace 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyStats = await prisma.dailyEntry.groupBy({
      by: ['date'],
      _count: {
        id: true
      },
      where: {
        date: {
          gte: thirtyDaysAgo
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    // Formatear los datos para que sean más fáciles de usar en el frontend
    const formattedStats = dailyStats.map(stat => ({
      date: stat.date.toISOString().split('T')[0], // Solo la fecha YYYY-MM-DD
      count: stat._count.id
    }));

    res.json(formattedStats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener estadísticas diarias' });
  }
};

// Obtener estadísticas de Daily Entries por mes (último año)
export const getDailyEntriesPerMonth = async (req, res) => {
  try {
    // Fecha hace 12 meses
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    // Obtener todas las entradas del último año
    const entries = await prisma.dailyEntry.findMany({
      where: {
        date: {
          gte: twelveMonthsAgo
        }
      },
      select: {
        date: true
      }
    });

    // Agrupar por mes manualmente
    const monthlyStats = {};
    
    entries.forEach(entry => {
      const month = entry.date.toISOString().substring(0, 7); // YYYY-MM
      monthlyStats[month] = (monthlyStats[month] || 0) + 1;
    });

    // Convertir a array y ordenar
    const formattedStats = Object.entries(monthlyStats)
      .map(([month, count]) => ({
        month,
        count
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    res.json(formattedStats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener estadísticas mensuales' });
  }
};

// Obtener estadísticas completas (combinadas)
export const getCompleteStats = async (req, res) => {
  try {
    const [
      generalStats,
      dailyStats,
      monthlyStats
    ] = await Promise.all([
      // Estadísticas generales
      Promise.all([
        prisma.user.count(),
        prisma.post.count({ where: { published: true } }),
        prisma.event.count(),
        prisma.dailyEntry.count()
      ]),
      
      // Estadísticas diarias (últimos 7 días)
      getDailyEntriesData(7),
      
      // Estadísticas mensuales (últimos 6 meses)
      getMonthlyEntriesData(6)
    ]);

    const [totalUsers, totalPublishedPosts, totalEvents, totalDailyEntries] = generalStats;

    res.json({
      general: {
        totalUsers,
        totalPublishedPosts,
        totalEvents,
        totalDailyEntries
      },
      dailyEntries: {
        daily: dailyStats,
        monthly: monthlyStats
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener estadísticas completas' });
  }
};

// Función auxiliar para obtener datos diarios
const getDailyEntriesData = async (days) => {
  const daysAgo = new Date();
  daysAgo.setDate(daysAgo.getDate() - days);

  const entries = await prisma.dailyEntry.findMany({
    where: {
      date: {
        gte: daysAgo
      }
    },
    select: {
      date: true
    }
  });

  const dailyStats = {};
  entries.forEach(entry => {
    const day = entry.date.toISOString().split('T')[0];
    dailyStats[day] = (dailyStats[day] || 0) + 1;
  });

  return Object.entries(dailyStats)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

// Función auxiliar para obtener datos mensuales
const getMonthlyEntriesData = async (months) => {
  const monthsAgo = new Date();
  monthsAgo.setMonth(monthsAgo.getMonth() - months);

  const entries = await prisma.dailyEntry.findMany({
    where: {
      date: {
        gte: monthsAgo
      }
    },
    select: {
      date: true
    }
  });

  const monthlyStats = {};
  entries.forEach(entry => {
    const month = entry.date.toISOString().substring(0, 7);
    monthlyStats[month] = (monthlyStats[month] || 0) + 1;
  });

  return Object.entries(monthlyStats)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));
};

// Obtener estadísticas de usuarios por rol
export const getUserStatsByRole = async (req, res) => {
  try {
    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        id: true
      }
    });

    const formattedStats = usersByRole.map(stat => ({
      role: stat.role,
      count: stat._count.id
    }));

    res.json(formattedStats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener estadísticas de usuarios por rol' });
  }
};
