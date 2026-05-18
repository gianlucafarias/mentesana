import { prisma } from '../config/database.js';
import { buildWeeklyStats, generateWeeklySummaryWithAI, getCurrentWeekRange } from '../services/weeklySummary.service.js';

export const getCurrentWeeklySummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const { weekStart, weekEnd } = getCurrentWeekRange();

    const existing = await prisma.weeklySummary.findUnique({
      where: {
        userId_weekStart: {
          userId,
          weekStart
        }
      }
    });

    if (existing) {
      return res.json({
        summary: existing,
        source: 'cached'
      });
    }

    const previousWeekStart = new Date(weekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);
    const previousWeekEnd = new Date(weekEnd);
    previousWeekEnd.setDate(previousWeekEnd.getDate() - 7);

    const [currentWeekEntries, previousWeekEntries] = await Promise.all([
      prisma.dailyEntry.findMany({
        where: {
          userId,
          date: {
            gte: weekStart,
            lte: weekEnd
          }
        },
        orderBy: { date: 'asc' }
      }),
      prisma.dailyEntry.findMany({
        where: {
          userId,
          date: {
            gte: previousWeekStart,
            lte: previousWeekEnd
          }
        },
        orderBy: { date: 'asc' }
      }),
    ]);

    if (currentWeekEntries.length < 3) {
      return res.status(400).json({
        message: 'Necesitas al menos 3 entradas en la semana actual para generar el resumen comparativo',
        currentWeekEntries: currentWeekEntries.length
      });
    }

    const stats = buildWeeklyStats(currentWeekEntries, previousWeekEntries);
    const aiResult = await generateWeeklySummaryWithAI(stats);

    const saved = await prisma.weeklySummary.create({
      data: {
        userId,
        weekStart,
        weekEnd,
        summary: aiResult.summary,
        advice: aiResult.advice,
        riskLevel: aiResult.riskLevel,
        safetyFlags: aiResult.safetyFlags,
        aiModel: aiResult.model,
        aiPromptVersion: aiResult.promptVersion,
        statsData: stats
      }
    });

    return res.json({
      summary: saved,
      source: 'generated'
    });
  } catch (error) {
    console.error('Error al obtener resumen semanal:', error);
    return res.status(500).json({ message: 'Error al generar resumen semanal' });
  }
};
