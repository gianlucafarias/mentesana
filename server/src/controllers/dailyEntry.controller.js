import { prisma } from '../config/database.js';
import { generateMotivationalMessage } from '../services/openai.service.js';
import achievementService from '../services/achievement.service.js';

const parseLocalDate = (dateString) => {
  const dateParts = dateString.split('-');
  if (dateParts.length !== 3) {
    return null;
  }
  const year = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10) - 1;
  const day = parseInt(dateParts[2], 10);
  const result = new Date(year, month, day);
  if (Number.isNaN(result.getTime())) {
    return null;
  }
  return result;
};

const toEntryDate = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const createDailyEntry = async (req, res) => {
  try {
    const { mood, notes, date } = req.body;
    const userId = req.user.id;

    const userExists = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!userExists) {
      return res.status(404).json({ message: 'Usuario no encontrado en la base de datos' });
    }

    let targetDate;
    if (date) {
      targetDate = parseLocalDate(date);
      if (!targetDate) {
        return res.status(400).json({ message: 'Formato de fecha inválido. Use YYYY-MM-DD' });
      }
    } else {
      targetDate = new Date();
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDay = new Date(targetDate);
    targetDay.setHours(0, 0, 0, 0);
    if (targetDay > today) {
      return res.status(400).json({ message: 'No puedes registrar entradas para fechas futuras' });
    }

    const entryDate = toEntryDate(targetDate);
    const existingEntry = await prisma.dailyEntry.findFirst({
      where: {
        userId,
        entryDate
      }
    });

    if (existingEntry) {
      const isToday = entryDate === toEntryDate(new Date());
      return res.status(409).json({
        message: isToday
          ? 'Ya has registrado una entrada para hoy. Podrás crear una nueva entrada mañana.'
          : `Ya has registrado una entrada para ${entryDate}.`,
        existingEntry
      });
    }

    const aiResult = await generateMotivationalMessage(mood, notes);

    const createData = {
      mood,
      notes,
      aiMessage: aiResult.message,
      aiMessageData: aiResult.uiMessage || null,
      riskLevel: aiResult.riskLevel,
      safetyFlags: aiResult.safetyFlags,
      aiModel: aiResult.model,
      aiPromptVersion: aiResult.promptVersion,
      userId,
      date: targetDate,
      entryDate
    };

    let entry;
    try {
      entry = await prisma.dailyEntry.create({
        data: createData
      });
    } catch (dbError) {
      if (dbError.code === 'P2002') {
        return res.status(409).json({
          message: `Ya has registrado una entrada para ${entryDate}.`
        });
      }
      throw dbError;
    }

    const achievementSync = await achievementService.syncUserAchievements(userId);
    res.status(201).json({ ...entry, unlockedAchievements: achievementSync.unlockedNow });
  } catch (error) {
    console.error('Error al crear entrada diaria:', error);
    if (error?.name === 'AIResponseValidationError') {
      return res.status(502).json({
        message: 'No se pudo generar una respuesta válida de IA. Intenta nuevamente en unos segundos.'
      });
    }
    if (error?.name === 'PrismaClientValidationError' && String(error?.message || '').includes('aiMessageData')) {
      return res.status(500).json({
        message: 'El servidor no está sincronizado con la base de datos. Ejecuta migraciones y reinicia.'
      });
    }
    res.status(500).json({ message: 'Error al crear la entrada diaria' });
  }
};

export const getDailyEntries = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    const whereClause = { userId };

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setUTCHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);

      whereClause.date = {
        gte: start,
        lte: end
      };
    }

    const entries = await prisma.dailyEntry.findMany({
      where: whereClause,
      orderBy: {
        date: 'desc'
      }
    });

    res.json(entries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener las entradas diarias' });
  }
};

export const getDailyEntryById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const entry = await prisma.dailyEntry.findUnique({
      where: { id }
    });

    if (!entry) {
      return res.status(404).json({ message: 'Entrada no encontrada' });
    }

    if (entry.userId !== userId) {
      return res.status(403).json({ message: 'No tienes permiso para ver esta entrada' });
    }

    res.json(entry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener la entrada diaria' });
  }
};

export const updateDailyEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { mood, notes } = req.body;
    const userId = req.user.id;

    const entry = await prisma.dailyEntry.findUnique({
      where: { id }
    });

    if (!entry) {
      return res.status(404).json({ message: 'Entrada no encontrada' });
    }

    if (entry.userId !== userId) {
      return res.status(403).json({ message: 'No tienes permiso para editar esta entrada' });
    }

    const aiResult = await generateMotivationalMessage(mood, notes);

    const updateData = {
      mood,
      notes,
      aiMessage: aiResult.message,
      aiMessageData: aiResult.uiMessage || null,
      riskLevel: aiResult.riskLevel,
      safetyFlags: aiResult.safetyFlags,
      aiModel: aiResult.model,
      aiPromptVersion: aiResult.promptVersion
    };

    const updatedEntry = await prisma.dailyEntry.update({
      where: { id },
      data: updateData
    });
    const achievementSync = await achievementService.syncUserAchievements(userId);

    res.json({ ...updatedEntry, unlockedAchievements: achievementSync.unlockedNow });
  } catch (error) {
    console.error(error);
    if (error?.name === 'AIResponseValidationError') {
      return res.status(502).json({
        message: 'No se pudo generar una respuesta válida de IA. Intenta nuevamente en unos segundos.'
      });
    }
    if (error?.name === 'PrismaClientValidationError' && String(error?.message || '').includes('aiMessageData')) {
      return res.status(500).json({
        message: 'El servidor no está sincronizado con la base de datos. Ejecuta migraciones y reinicia.'
      });
    }
    res.status(500).json({ message: 'Error al actualizar la entrada diaria' });
  }
};

export const deleteDailyEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const entry = await prisma.dailyEntry.findUnique({
      where: { id }
    });

    if (!entry) {
      return res.status(404).json({ message: 'Entrada no encontrada' });
    }

    if (entry.userId !== userId) {
      return res.status(403).json({ message: 'No tienes permiso para eliminar esta entrada' });
    }

    await prisma.dailyEntry.delete({
      where: { id }
    });

    res.json({ message: 'Entrada eliminada correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al eliminar la entrada diaria' });
  }
};

export const canCreateEntryToday = async (req, res) => {
  try {
    const userId = req.user.id;
    const entryDate = toEntryDate(new Date());

    const existingEntry = await prisma.dailyEntry.findFirst({
      where: {
        userId,
        entryDate
      }
    });

    res.json({
      canCreate: !existingEntry,
      hasEntryToday: !!existingEntry,
      existingEntry: existingEntry || null
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al verificar las entradas diarias' });
  }
};

export const canCreateEntryForDate = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.params;

    const targetDate = parseLocalDate(date);
    if (!targetDate) {
      return res.status(400).json({ message: 'Formato de fecha inválido. Use YYYY-MM-DD' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (targetDate > today) {
      return res.status(400).json({
        message: 'No puedes registrar entradas para fechas futuras',
        canCreate: false,
        reason: 'future_date'
      });
    }

    const entryDate = toEntryDate(targetDate);

    const existingEntry = await prisma.dailyEntry.findFirst({
      where: {
        userId,
        entryDate
      }
    });

    res.json({
      canCreate: !existingEntry,
      hasEntry: !!existingEntry,
      existingEntry: existingEntry || null,
      targetDate: entryDate,
      isToday: entryDate === toEntryDate(today)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al verificar la entrada para la fecha especificada' });
  }
};
