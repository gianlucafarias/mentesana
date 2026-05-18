import { PrismaClient } from '@prisma/client';
import insightService from '../services/insight.service.js';

const prisma = new PrismaClient();

// Obtener insights del usuario
export const getUserInsights = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Obtener insights activos del usuario
    const insights = await prisma.userInsight.findMany({
      where: {
        userId: userId,
        isActive: true
      },
      orderBy: {
        confidence: 'desc'
      }
    });

    // Si no hay insights, verificar si se pueden generar
    if (insights.length === 0) {
      const canGenerate = await canGenerateInsights(userId);
      
      if (canGenerate) {
        try {
          // Generar insights automáticamente
          const newInsights = await insightService.generateUserInsights(userId);
          
          res.json({
            insights: newInsights,
            total: newInsights.length,
            lastUpdated: new Date(),
            message: 'Insights generados automáticamente'
          });
          return;
        } catch (error) {
          console.error('Error generando insights automáticamente:', error);
          return res.status(500).json({
            message: 'Error generando insights',
            error: error.message
          });
        }
      } else {
        const { reason, nextGeneration } = await getGenerationStatus(userId);
        return res.status(404).json({
          message: 'No hay insights disponibles',
          reason: reason,
          nextGeneration: nextGeneration
        });
      }
    }

    // Verificar si se pueden regenerar insights
    const canRegenerate = await canRegenerateInsights(userId);
    if (canRegenerate) {
      try {
        // Regenerar insights automáticamente
        const newInsights = await insightService.generateUserInsights(userId);
        
        res.json({
          insights: newInsights,
          total: newInsights.length,
          lastUpdated: new Date(),
          message: 'Insights actualizados automáticamente'
        });
        return;
      } catch (error) {
        console.error('Error regenerando insights:', error);
        // Si falla la regeneración, mostrar los insights existentes
      }
    }

    // Mostrar insights existentes
    res.json({
      insights: insights,
      total: insights.length,
      lastUpdated: insights[0]?.lastGenerated,
      canRegenerate: canRegenerate
    });

  } catch (error) {
    console.error('Error obteniendo insights:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: error.message 
    });
  }
};

// Verificar si se pueden generar insights para un usuario
export const canGenerateInsights = async (userId) => {
  try {
    // Contar entradas totales del usuario
    const totalEntries = await prisma.dailyEntry.count({
      where: { userId: userId }
    });

    // Primera generación: mínimo 3 entradas
    return totalEntries >= 3;

  } catch (error) {
    console.error('Error verificando generación de insights:', error);
    return false;
  }
};

// Verificar si se pueden regenerar insights
export const canRegenerateInsights = async (userId) => {
  try {
    // Obtener el último insight generado
    const lastInsight = await prisma.userInsight.findFirst({
      where: {
        userId: userId,
        isActive: true
      },
      orderBy: {
        lastGenerated: 'desc'
      }
    });

    if (!lastInsight) {
      return false;
    }

    // Contar entradas desde la última generación
    const entriesSinceLastGeneration = await prisma.dailyEntry.count({
      where: {
        userId: userId,
        createdAt: {
          gt: lastInsight.lastGenerated
        }
      }
    });

    // Regenerar después de 5 nuevas entradas
    return entriesSinceLastGeneration >= 5;

  } catch (error) {
    console.error('Error verificando regeneración de insights:', error);
    return false;
  }
};

// Obtener estado de generación de insights
export const getGenerationStatus = async (userId) => {
  try {
    const totalEntries = await prisma.dailyEntry.count({
      where: { userId: userId }
    });

    if (totalEntries < 3) {
      return {
        reason: `Necesitas al menos 3 entradas para generar insights. Tienes ${totalEntries}.`,
        nextGeneration: null
      };
    }

    // Si ya tiene 3+ entradas pero no insights, puede generar
    const existingInsights = await prisma.userInsight.findFirst({
      where: {
        userId: userId,
        isActive: true
      }
    });

    if (!existingInsights) {
      return {
        reason: 'Puedes generar insights ahora',
        nextGeneration: null
      };
    }

    // Calcular cuántas entradas faltan para regenerar
    const entriesSinceLastGeneration = await prisma.dailyEntry.count({
      where: {
        userId: userId,
        createdAt: {
          gt: existingInsights.lastGenerated
        }
      }
    });

    const remainingEntries = 5 - entriesSinceLastGeneration;

    if (remainingEntries > 0) {
      return {
        reason: `Faltan ${remainingEntries} entradas para regenerar insights`,
        nextGeneration: null
      };
    }

    return {
      reason: 'Puedes regenerar insights ahora',
      nextGeneration: null
    };

  } catch (error) {
    console.error('Error obteniendo estado de generación:', error);
    return {
      reason: 'Error verificando estado',
      nextGeneration: null
    };
  }
};

// Obtener estadísticas para insights
export const getInsightStats = async (userId) => {
  try {
    // Obtener entradas recientes (últimas 7)
    const recentEntries = await prisma.dailyEntry.findMany({
      where: { userId: userId },
      orderBy: { date: 'desc' },
      take: 7
    });

    // Obtener entradas anteriores para comparación
    const previousEntries = await prisma.dailyEntry.findMany({
      where: { userId: userId },
      orderBy: { date: 'desc' },
      skip: 7,
      take: 7
    });

    // Calcular estadísticas de entradas recientes
    const recentStats = calculateEntryStats(recentEntries);
    
    // Calcular estadísticas de entradas anteriores
    const previousStats = calculateEntryStats(previousEntries);
    
    // Calcular mejoras
    const improvement = calculateImprovement(recentStats, previousStats);

    // Calcular estadísticas adicionales
    const entriesWithNotes = recentEntries.filter(entry => entry.notes && entry.notes.trim().length > 0).length;
    const notesPercentage = recentEntries.length > 0 ? (entriesWithNotes / recentEntries.length) * 100 : 0;

    return {
      recentStats,
      previousStats,
      improvement,
      totalEntries: recentEntries.length + previousEntries.length,
      entriesWithNotes,
      notesPercentage
    };

  } catch (error) {
    console.error('Error obteniendo estadísticas para insights:', error);
    return null;
  }
};

// Calcular estadísticas de un conjunto de entradas
const calculateEntryStats = (entries) => {
  if (!entries || entries.length === 0) {
    return {
      count: 0,
      avgMood: 0,
      avgEnergy: 0,
      avgSleep: 0,
      moodDistribution: {},
      energyDistribution: {},
      sleepDistribution: {}
    };
  }

  const moodSum = entries.reduce((sum, entry) => sum + (entry.mood || 0), 0);
  const energySum = entries.reduce((sum, entry) => sum + (entry.energy || 0), 0);
  const sleepSum = entries.reduce((sum, entry) => sum + (entry.sleepHours || 0), 0);

  const moodDistribution = entries.reduce((acc, entry) => {
    const mood = entry.mood || 0;
    acc[mood] = (acc[mood] || 0) + 1;
    return acc;
  }, {});

  const energyDistribution = entries.reduce((acc, entry) => {
    const energy = entry.energy || 0;
    acc[energy] = (acc[energy] || 0) + 1;
    return acc;
  }, {});

  const sleepDistribution = entries.reduce((acc, entry) => {
    const sleep = entry.sleepHours || 0;
    acc[sleep] = (acc[sleep] || 0) + 1;
    return acc;
  }, {});

  return {
    count: entries.length,
    avgMood: moodSum / entries.length,
    avgEnergy: energySum / entries.length,
    avgSleep: sleepSum / entries.length,
    moodDistribution,
    energyDistribution,
    sleepDistribution
  };
};

// Calcular mejoras entre dos conjuntos de estadísticas
const calculateImprovement = (recent, previous) => {
  if (!recent || !previous || recent.count === 0 || previous.count === 0) {
    return {
      moodImproved: false,
      energyImproved: false,
      sleepImproved: false,
      overallTrend: 'neutral'
    };
  }

  const moodImproved = recent.avgMood > previous.avgMood;
  const energyImproved = recent.avgEnergy > previous.avgEnergy;
  const sleepImproved = Math.abs(recent.avgSleep - 8) < Math.abs(previous.avgSleep - 8); // Más cercano a 8 horas

  const improvements = [moodImproved, energyImproved, sleepImproved].filter(Boolean).length;
  
  let overallTrend = 'neutral';
  if (improvements >= 2) {
    overallTrend = 'positive';
  } else if (improvements <= 1) {
    overallTrend = 'negative';
  }

  return {
    moodImproved,
    energyImproved,
    sleepImproved,
    overallTrend,
    moodDifference: recent.avgMood - previous.avgMood,
    energyDifference: recent.avgEnergy - previous.avgEnergy,
    sleepDifference: recent.avgSleep - previous.avgSleep,
    percentageChange: previous.avgMood > 0 ? ((recent.avgMood - previous.avgMood) / previous.avgMood) * 100 : 0
  };
};

// Marcar insights como obsoletos
export const markInsightsAsObsolete = async (userId) => {
  try {
    await prisma.userInsight.updateMany({
      where: {
        userId: userId,
        isActive: true
      },
      data: {
        isActive: false
      }
    });
  } catch (error) {
    console.error('Error marcando insights como obsoletos:', error);
  }
};

// Exportar controlador por defecto para compatibilidad
export default {
  getUserInsights,
  canGenerateInsights,
  canRegenerateInsights,
  getGenerationStatus,
  getInsightStats,
  markInsightsAsObsolete
};
