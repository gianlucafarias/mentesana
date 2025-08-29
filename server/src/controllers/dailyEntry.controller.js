import { prisma } from '../config/database.js';
import { generateMotivationalMessage } from '../services/openai.service.js';

export const createDailyEntry = async (req, res) => {
  try {
    const { mood, notes, date } = req.body; // Agregar date del body
    const userId = req.user.id;

    console.log('Usuario autenticado:', req.user);
    console.log('userId:', userId);
    console.log('Fecha recibida:', date);

    // Verificar que el usuario existe en la base de datos
    const userExists = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!userExists) {
      return res.status(404).json({ message: 'Usuario no encontrado en la base de datos' });
    }

    console.log('Usuario encontrado:', userExists.id);

    // Determinar la fecha objetivo (usar la enviada o la actual)
    let targetDate;
    if (date) {
      // Si se proporciona una fecha específica, usarla
      const dateParts = date.split('-');
      if (dateParts.length !== 3) {
        return res.status(400).json({ message: 'Formato de fecha inválido. Use YYYY-MM-DD' });
      }
      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1; // JavaScript months are 0-based
      const day = parseInt(dateParts[2]);
      targetDate = new Date(year, month, day);
    } else {
      // Si no se proporciona fecha, usar hoy
      targetDate = new Date();
    }

    // Verificar si ya existe una entrada para la fecha objetivo
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

    const existingEntry = await prisma.dailyEntry.findFirst({
      where: {
        userId: userId,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    if (existingEntry) {
      const isToday = targetDate.toDateString() === new Date().toDateString();
      return res.status(409).json({ 
        message: isToday 
          ? 'Ya has registrado una entrada para hoy. Podrás crear una nueva entrada mañana.'
          : `Ya has registrado una entrada para ${date || 'esta fecha'}.`,
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
        userId,
        date: targetDate // Usar la fecha objetivo
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

// Nuevo endpoint para verificar entrada en fecha específica
export const canCreateEntryForDate = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.params; // formato: YYYY-MM-DD

    // Validar formato de fecha y usar construcción local
    const dateParts = date.split('-');
    if (dateParts.length !== 3) {
      return res.status(400).json({ message: 'Formato de fecha inválido. Use YYYY-MM-DD' });
    }
    
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1; // JavaScript months are 0-based
    const day = parseInt(dateParts[2]);
    
    // Crear fecha local para evitar problemas de zona horaria
    const targetDate = new Date(year, month, day);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ message: 'Formato de fecha inválido' });
    }

    // Verificar si la fecha es futura (no permitir)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (targetDate > today) {
      return res.status(400).json({ 
        message: 'No puedes registrar entradas para fechas futuras',
        canCreate: false,
        reason: 'future_date'
      });
    }

    // Verificar si ya existe una entrada para esa fecha usando fecha local
    const startOfDay = new Date(year, month, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, month, day, 23, 59, 59, 999);

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
      hasEntry: !!existingEntry,
      existingEntry: existingEntry || null,
      targetDate: date,
      isToday: targetDate.getTime() === today.getTime()
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al verificar la entrada para la fecha especificada' });
  }
}; 