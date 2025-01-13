import { prisma } from '../../index.js';

export const createNotification = async ({
  userId,
  type,
  title,
  message,
  link = null
}) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        link
      }
    });
    return notification;
  } catch (error) {
    console.error('Error al crear notificación:', error);
    throw error;
  }
};

// Función para notificar sobre nuevos eventos
export const notifyNewEvent = async (event, excludeUserId = null) => {
  try {
    // Obtener todos los usuarios excepto el creador del evento
    const users = await prisma.user.findMany({
      where: {
        id: {
          not: excludeUserId
        }
      }
    });

    // Crear notificaciones para cada usuario
    const notifications = users.map(user => ({
      userId: user.id,
      type: 'event',
      title: 'Nuevo evento disponible',
      message: `Se ha creado un nuevo evento: ${event.title}`,
      link: `/events/${event.id}`
    }));

    await prisma.notification.createMany({
      data: notifications
    });
  } catch (error) {
    console.error('Error al notificar nuevo evento:', error);
    throw error;
  }
};

// Función para notificar sobre nuevos posts
export const notifyNewPost = async (post, excludeUserId = null) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        id: {
          not: excludeUserId
        }
      }
    });

    const notifications = users.map(user => ({
      userId: user.id,
      type: 'post',
      title: 'Nueva publicación en el blog',
      message: `Se ha publicado un nuevo post: ${post.title}`,
      link: `/blog/${post.id}`
    }));

    await prisma.notification.createMany({
      data: notifications
    });
  } catch (error) {
    console.error('Error al notificar nuevo post:', error);
    throw error;
  }
}; 