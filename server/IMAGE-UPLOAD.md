# 📸 Sistema de Upload de Imágenes

## Descripción

Sistema dedicado para el upload y manejo de imágenes en MenteSana, resolviendo el error 413 "Payload Too Large" al enviar imágenes grandes como base64.

**Módulos compatibles:**
- ✅ **Posts del Blog** (`/api/blog`)
- ✅ **Eventos** (`/api/events`)
- ✅ **Cualquier módulo futuro** que necesite imágenes

## ✅ Características

- ✅ Upload de imágenes hasta **5MB**
- ✅ Formatos soportados: **JPEG, PNG, GIF, WebP**
- ✅ Validación de tipos de archivo
- ✅ Nombres únicos para evitar conflictos
- ✅ Rate limiting específico para uploads
- ✅ Eliminación automática al borrar posts y eventos
- ✅ Servido de imágenes como archivos estáticos
- ✅ Autenticación requerida

## 🚀 Endpoints

### 1. Subir Imagen
```http
POST /api/upload/image
Content-Type: multipart/form-data
Authorization: Bearer <token>

Campo del formulario: "image"
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Imagen subida exitosamente",
  "image": {
    "filename": "1641123456789-123456789.jpg",
    "originalName": "mi-imagen.jpg",
    "size": 156789,
    "mimeType": "image/jpeg",
    "url": "http://localhost:3000/uploads/1641123456789-123456789.jpg"
  }
}
```

### 2. Eliminar Imagen
```http
DELETE /api/upload/image/:filename
Authorization: Bearer <token>
```

### 3. Información de Imagen
```http
GET /api/upload/image/:filename/info
Authorization: Bearer <token>
```

### 4. Acceder Imagen
```http
GET /uploads/:filename
```

## 📝 Flujo de Trabajo

### Crear Post con Imagen

1. **Subir imagen primero:**
```javascript
const formData = new FormData();
formData.append('image', fileInput.files[0]);

const uploadResponse = await fetch('/api/upload/image', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const { image } = await uploadResponse.json();
```

2. **Crear post con URL de imagen:**
```javascript
const postData = {
  title: "Mi Post",
  content: "Contenido del post...",
  image: image.url  // URL de la imagen subida
};

const postResponse = await fetch('/api/blog', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(postData)
});
```

### Crear Evento con Imagen

1. **Subir imagen primero (mismo endpoint):**
```javascript
const formData = new FormData();
formData.append('image', eventImageFile);

const uploadResponse = await fetch('/api/upload/image', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const { image } = await uploadResponse.json();
```

2. **Crear evento con URL de imagen:**
```javascript
const eventData = {
  title: "Mi Evento",
  description: "Descripción del evento...",
  date: "2024-12-31T18:00:00Z",
  location: "Centro de Salud Mental",
  image: image.url  // URL de la imagen subida (misma que para posts)
};

const eventResponse = await fetch('/api/events', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(eventData)
});
```

## ⚙️ Configuración

### Límites Configurados

- **Tamaño máximo:** 5MB por imagen
- **Rate limiting:** 10 uploads/hora (producción), 50 uploads/hora (desarrollo)
- **Tipos permitidos:** image/jpeg, image/png, image/gif, image/webp
- **Archivos simultáneos:** 1 por request

### Variables de Entorno

```bash
NODE_ENV=development|production  # Afecta los límites de rate limiting
```

## 🔒 Seguridad

- ✅ Autenticación requerida para todos los endpoints
- ✅ Validación de tipos MIME
- ✅ Sanitización de nombres de archivo
- ✅ Rate limiting específico para uploads
- ✅ Validación de tamaño de archivo
- ✅ Prevención de path traversal

## 🐛 Manejo de Errores

### Error 400 - Archivo demasiado grande
```json
{
  "error": "Archivo demasiado grande",
  "message": "El archivo no puede superar los 5MB",
  "maxSize": "5MB"
}
```

### Error 400 - Tipo no permitido
```json
{
  "error": "Tipo de archivo no válido",
  "message": "Tipo de archivo no permitido. Solo se permiten imágenes (JPEG, PNG, GIF, WebP)",
  "allowedTypes": ["JPEG", "PNG", "GIF", "WebP"]
}
```

### Error 429 - Rate limit excedido
```json
{
  "error": "Límite de uploads alcanzado",
  "message": "Demasiadas cargas de imágenes. Intenta en 1 hora.",
  "retryAfter": 3600
}
```

## 📂 Estructura de Archivos

```
server/
├── uploads/              # Directorio de imágenes (gitignored)
│   ├── .gitignore       # Ignora todas las imágenes
│   └── [imágenes...]    # Archivos de imagen subidos
├── src/
│   ├── config/
│   │   └── upload.config.js    # Configuración de multer
│   ├── controllers/
│   │   └── upload.controller.js # Controladores de upload
│   └── routes/
│       └── upload.routes.js     # Rutas de upload
└── IMAGE-UPLOAD.md      # Esta documentación
```

## 🔄 Migración de Base64

Si tienes imágenes existentes en base64:

1. **Extraer y guardar como archivo:**
```javascript
// Convertir base64 a archivo
const base64Data = existingPost.image.replace(/^data:image\/\w+;base64,/, "");
const buffer = Buffer.from(base64Data, 'base64');
const filename = `migrated-${Date.now()}.jpg`;
fs.writeFileSync(`./uploads/${filename}`, buffer);

// Actualizar post con nueva URL
await prisma.post.update({
  where: { id: postId },
  data: { image: `/uploads/${filename}` }
});
```

## 🚀 Próximas Mejoras

- [ ] Integración con cloud storage (AWS S3, Cloudinary)
- [ ] Redimensionamiento automático de imágenes
- [ ] Generación de miniaturas
- [ ] Compresión automática
- [ ] Soporte para múltiples imágenes por post
- [ ] Galería de imágenes del usuario 