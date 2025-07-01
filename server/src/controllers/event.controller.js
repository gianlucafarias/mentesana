import { prisma } from '../../index.js';
import { notifyNewEvent } from '../services/notification.service.js';

export const createEvent = async (req, res) => {
  try {
    const { title, description, date, location, image } = req.body;
    const authorId = req.user.id;

    const event = await prisma.event.create({
      data: {
        title,
        description,
        date: new Date(date),
        location,
        image,
        authorId
      }
    });

    // Notificar a otros usuarios sobre el nuevo evento
    await notifyNewEvent(event, authorId);

    res.status(201).json(event);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al crear el evento' });
  }
};

export const getAllEvents = async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener los eventos' });
  }
};

export const getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!event) {
      return res.status(404).json({ message: 'Evento no encontrado' });
    }

    res.json(event);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener el evento' });
  }
};

export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, date, location, image } = req.body;
    const userId = req.user.id;

    // Verificar que el evento existe y pertenece al usuario
    const existingEvent = await prisma.event.findUnique({
      where: { id }
    });

    if (!existingEvent) {
      return res.status(404).json({ message: 'Evento no encontrado' });
    }

    if (existingEvent.authorId !== userId) {
      return res.status(403).json({ message: 'No tienes permiso para editar este evento' });
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        title,
        description,
        date: new Date(date),
        location,
        image
      }
    });

    res.json(updatedEvent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al actualizar el evento' });
  }
};

export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verificar que el evento existe y pertenece al usuario
    const existingEvent = await prisma.event.findUnique({
      where: { id }
    });

    if (!existingEvent) {
      return res.status(404).json({ message: 'Evento no encontrado' });
    }

    if (existingEvent.authorId !== userId) {
      return res.status(403).json({ message: 'No tienes permiso para eliminar este evento' });
    }

    await prisma.event.delete({
      where: { id }
    });

    res.json({ message: 'Evento eliminado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al eliminar el evento' });
  }
};

export const getUpcomingEvents = async (req, res) => {
  try {
    const currentDate = new Date();

    const events = await prisma.event.findMany({
      where: {
        date: {
          gte: currentDate
        }
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener los eventos próximos' });
  }
};

export const getPastEvents = async (req, res) => {
  try {
    const currentDate = new Date();

    const events = await prisma.event.findMany({
      where: {
        date: {
          lt: currentDate
        }
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        date: 'desc' // Ordenamos los eventos pasados del más reciente al más antiguo
      }
    });

    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener los eventos pasados' });
  }
}; 