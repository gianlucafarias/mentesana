import { buildImageUrl, deleteImageFile } from '../config/upload.config.js';

// Upload de una imagen
export const uploadImage = async (req, res) => {
  try {
    // Verificar que se subió un archivo
    if (!req.file) {
      return res.status(400).json({
        error: 'No se recibió ninguna imagen',
        message: 'Debe enviar una imagen en el campo "image"'
      });
    }

    // Construir URL de la imagen
    const imageUrl = buildImageUrl(req, req.file.filename);

    // Respuesta con información de la imagen subida
    res.status(200).json({
      success: true,
      message: 'Imagen subida exitosamente',
      image: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        url: imageUrl
      }
    });

  } catch (error) {
    console.error('Error en upload de imagen:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Error al procesar la imagen'
    });
  }
};

// Eliminar una imagen
export const deleteImage = async (req, res) => {
  try {
    const { filename } = req.params;

    // Validar nombre de archivo
    if (!filename || filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({
        error: 'Nombre de archivo inválido',
        message: 'El nombre del archivo no es válido'
      });
    }

    // Intentar eliminar el archivo
    const deleted = deleteImageFile(filename);

    if (deleted) {
      res.status(200).json({
        success: true,
        message: 'Imagen eliminada exitosamente',
        filename: filename
      });
    } else {
      res.status(404).json({
        error: 'Imagen no encontrada',
        message: 'La imagen especificada no existe'
      });
    }

  } catch (error) {
    console.error('Error al eliminar imagen:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Error al eliminar la imagen'
    });
  }
};

// Obtener información de una imagen
export const getImageInfo = async (req, res) => {
  try {
    const { filename } = req.params;

    // Validar nombre de archivo
    if (!filename || filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({
        error: 'Nombre de archivo inválido',
        message: 'El nombre del archivo no es válido'
      });
    }

    // Verificar que el archivo existe
    const filePath = `./uploads/${filename}`;
    const fs = await import('fs');
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: 'Imagen no encontrada',
        message: 'La imagen especificada no existe'
      });
    }

    // Obtener información del archivo
    const stats = fs.statSync(filePath);
    const imageUrl = buildImageUrl(req, filename);

    res.status(200).json({
      success: true,
      image: {
        filename: filename,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        url: imageUrl
      }
    });

  } catch (error) {
    console.error('Error al obtener info de imagen:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Error al obtener información de la imagen'
    });
  }
}; 