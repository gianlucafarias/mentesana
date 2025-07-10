import { prisma } from '../config/database.js';
import { notifyNewPost } from '../services/notification.service.js';
import { deleteImageFile } from '../config/upload.config.js';

export const createPost = async (req, res) => {
  try {
    const { title, content, image } = req.body;
    const authorId = req.user.id;

    const post = await prisma.post.create({
      data: {
        title,
        content,
        image,
        authorId
      }
    });

    // Notificar a otros usuarios sobre el nuevo post
    await notifyNewPost(post, authorId);

    res.status(201).json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al crear el post' });
  }
};

export const getAllPosts = async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
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
        createdAt: 'desc'
      }
    });

    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener los posts' });
  }
};

export const getPostById = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await prisma.post.findUnique({
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

    if (!post) {
      return res.status(404).json({ message: 'Post no encontrado' });
    }

    res.json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener el post' });
  }
};

export const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, image, published } = req.body;
    const userId = req.user.id;

    // Verificar que el post existe y pertenece al usuario
    const existingPost = await prisma.post.findUnique({
      where: { id }
    });

    if (!existingPost) {
      return res.status(404).json({ message: 'Post no encontrado' });
    }

    if (existingPost.authorId !== userId) {
      return res.status(403).json({ message: 'No tienes permiso para editar este post' });
    }

    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        title,
        content,
        image,
        published
      }
    });

    res.json(updatedPost);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al actualizar el post' });
  }
};

export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verificar que el post existe y pertenece al usuario
    const existingPost = await prisma.post.findUnique({
      where: { id }
    });

    if (!existingPost) {
      return res.status(404).json({ message: 'Post no encontrado' });
    }

    if (existingPost.authorId !== userId) {
      return res.status(403).json({ message: 'No tienes permiso para eliminar este post' });
    }

    // Eliminar imagen asociada si existe
    if (existingPost.image) {
      try {
        // Extraer nombre del archivo de la URL
        const imageUrl = existingPost.image;
        const filename = imageUrl.split('/').pop();
        
        // Solo intentar eliminar si parece ser un archivo local
        if (filename && !imageUrl.startsWith('http')) {
          deleteImageFile(filename);
        }
      } catch (imageError) {
        console.warn('Error al eliminar imagen asociada:', imageError);
        // No fallar la eliminación del post si hay error con la imagen
      }
    }

    await prisma.post.delete({
      where: { id }
    });

    res.json({ message: 'Post eliminado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al eliminar el post' });
  }
}; 