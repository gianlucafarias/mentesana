import { prisma } from '../../index.js';

export const createDailyEntry = async (req, res) => {
  try {
    const { mood, notes } = req.body;
    const userId = req.user.id;

    // Verificar si ya existe una entrada para hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingEntry = await prisma.dailyEntry.findFirst({
      where: {
        userId,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    });

    if (existingEntry) {
      return res.status(400).json({ message: 'Ya has creado una entrada para hoy' });
    }

    const entry = await prisma.dailyEntry.create({
      data: {
        mood,
        notes,
        userId
      }
    });

    res.status(201).json(entry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al crear la entrada diaria' });
  }
};

export const getDailyEntries = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    const whereClause = {
      userId,
      ...(startDate && endDate
        ? {
            date: {
              gte: new Date(startDate),
              lte: new Date(endDate)
            }
          }
        : {})
    };

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

    const updatedEntry = await prisma.dailyEntry.update({
      where: { id },
      data: {
        mood,
        notes
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