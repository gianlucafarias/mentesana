import { prisma } from '../../index.js';
import { notifyNewEvent } from '../services/notification.service.js';
import { deleteImageFile } from '../config/upload.config.js';

export const createEvent = async (req, res) => {
  try {
    const { title, description, date, location, image, eventType } = req.body;
    const authorId = req.user.id;

    const event = await prisma.event.create({
      data: {
        title,
        description,
        date: new Date(date),
        location,
        image,
        eventType: eventType || 'PRESENCIAL',
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
    const { title, description, date, location, image, eventType } = req.body;
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

    // Preparar datos para actualizar
    const updateData = {
      title,
      description,
      date: new Date(date),
      location,
      image
    };

    // Solo actualizar eventType si se proporciona
    if (eventType) {
      updateData.eventType = eventType;
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: updateData
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

    // Eliminar imagen asociada si existe
    if (existingEvent.image) {
      try {
        // Extraer nombre del archivo de la URL
        const imageUrl = existingEvent.image;
        const filename = imageUrl.split('/').pop();
        
        // Solo intentar eliminar si parece ser un archivo local
        if (filename && !imageUrl.startsWith('http')) {
          deleteImageFile(filename);
        }
      } catch (imageError) {
        console.warn('Error al eliminar imagen asociada al evento:', imageError);
        // No fallar la eliminación del evento si hay error con la imagen
      }
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