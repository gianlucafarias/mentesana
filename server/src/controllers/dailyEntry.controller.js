import { prisma } from '../../index.js';
import { generateMotivationalMessage } from '../services/openai.service.js';

export const createDailyEntry = async (req, res) => {
  try {
    const { mood, notes } = req.body;
    const userId = req.user.id;

    console.log('Usuario autenticado:', req.user);
    console.log('userId:', userId);

    // Verificar que el usuario existe en la base de datos
    const userExists = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!userExists) {
      return res.status(404).json({ message: 'Usuario no encontrado en la base de datos' });
    }

    console.log('Usuario encontrado:', userExists.id);

    // Verificar si ya existe una entrada para hoy
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const existingEntry = await prisma.dailyEntry.findFirst({
      where: {
        userId: userId,
        date: {
          gte: startOfDay,
          lt: endOfDay
        }
      }
    });

    if (existingEntry) {
      return res.status(409).json({ 
        message: 'Ya has registrado una entrada para hoy. Podrás crear una nueva entrada mañana.',
        existingEntry: existingEntry
      });
    }

    // Generar mensaje motivacional con IA
    const aiMessage = await generateMotivationalMessage(mood, notes);

    const entry = await prisma.dailyEntry.create({
      data: {
        mood,
        notes,
        aiMessage,
        userId
      }
    });
    console.log('Entrada creada:', entry);
    res.status(201).json(entry);
  } catch (error) {
    console.error('Error completo:', error);
    res.status(500).json({ message: 'Error al crear la entrada diaria' });
  }
};

export const getDailyEntries = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    let whereClause = { userId };

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setUTCHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);

      whereClause.date = {
        gte: start,
        lte: end,
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

    // Regenerar mensaje motivacional con IA si se actualiza mood o notes
    const aiMessage = await generateMotivationalMessage(mood, notes);

    const updatedEntry = await prisma.dailyEntry.update({
      where: { id },
      data: {
        mood,
        notes,
        aiMessage
      }
    });

    res.json(updatedEntry);
  } catch (error) {
    console.error(error);
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

    // Verificar si ya existe una entrada para hoy
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const existingEntry = await prisma.dailyEntry.findFirst({
      where: {
        userId: userId,
        date: {
          gte: startOfDay,
          lt: endOfDay
        }
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