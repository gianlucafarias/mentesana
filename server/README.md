# Mente Sana - API Documentation

API REST para la aplicación Mente Sana, una plataforma para el bienestar mental.

## Configuración

1. Clonar el repositorio
2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno en `.env`:
```
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/mentesana?schema=public"
JWT_SECRET="tu_secreto_jwt_aqui"
```

4. Ejecutar migraciones de Prisma:
```bash
npx prisma generate
npx prisma db push
```

5. Iniciar el servidor:
```bash
npm start
```

## Endpoints

### Autenticación

#### Registro de Usuario
- **POST** `/api/auth/register`
- **Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123",
  "name": "Nombre Usuario"
}
```

#### Inicio de Sesión
- **POST** `/api/auth/login`
- **Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123"
}
```

#### Obtener Perfil
- **GET** `/api/auth/profile`
- **Headers:** Authorization: Bearer {token}

### Blog

#### Crear Post
- **POST** `/api/blog`
- **Headers:** Authorization: Bearer {token}
- **Body:**
```json
{
  "title": "Título del Post",
  "content": "Contenido del post",
  "published": true
}
```

#### Obtener Posts
- **GET** `/api/blog`
- **Público**

#### Obtener Post por ID
- **GET** `/api/blog/:id`
- **Público**

#### Actualizar Post
- **PUT** `/api/blog/:id`
- **Headers:** Authorization: Bearer {token}
- **Body:**
```json
{
  "title": "Nuevo Título",
  "content": "Nuevo contenido",
  "published": true
}
```

#### Eliminar Post
- **DELETE** `/api/blog/:id`
- **Headers:** Authorization: Bearer {token}

### Eventos

#### Crear Evento
- **POST** `/api/events`
- **Headers:** Authorization: Bearer {token}
- **Body:**
```json
{
  "title": "Título del Evento",
  "description": "Descripción del evento",
  "date": "2024-01-20T18:00:00Z",
  "location": "Ubicación del evento"
}
```

#### Obtener Eventos
- **GET** `/api/events`
- **Público**

#### Obtener Evento por ID
- **GET** `/api/events/:id`
- **Público**

#### Actualizar Evento
- **PUT** `/api/events/:id`
- **Headers:** Authorization: Bearer {token}
- **Body:**
```json
{
  "title": "Nuevo Título",
  "description": "Nueva descripción",
  "date": "2024-01-20T19:00:00Z",
  "location": "Nueva ubicación"
}
```

#### Eliminar Evento
- **DELETE** `/api/events/:id`
- **Headers:** Authorization: Bearer {token}

### Registro Diario

#### Crear Entrada Diaria
- **POST** `/api/daily-entries`
- **Headers:** Authorization: Bearer {token}
- **Body:**
```json
{
  "mood": 5,
  "notes": "Me siento muy bien hoy"
}
```

#### Obtener Entradas Diarias
- **GET** `/api/daily-entries`
- **Headers:** Authorization: Bearer {token}
- **Query Params:** 
  - startDate (opcional)
  - endDate (opcional)

#### Obtener Entrada por ID
- **GET** `/api/daily-entries/:id`
- **Headers:** Authorization: Bearer {token}

#### Actualizar Entrada
- **PUT** `/api/daily-entries/:id`
- **Headers:** Authorization: Bearer {token}
- **Body:**
```json
{
  "mood": 4,
  "notes": "Actualización de notas"
}
```

#### Eliminar Entrada
- **DELETE** `/api/daily-entries/:id`
- **Headers:** Authorization: Bearer {token}

### Notificaciones

#### Obtener Notificaciones
- **GET** `/api/notifications`
- **Headers:** Authorization: Bearer {token}
- **Query Params:**
  - page (default: 1)
  - limit (default: 10)

#### Obtener Contador de No Leídas
- **GET** `/api/notifications/unread-count`
- **Headers:** Authorization: Bearer {token}

#### Marcar Como Leída
- **PUT** `/api/notifications/:id/read`
- **Headers:** Authorization: Bearer {token}

#### Marcar Todas Como Leídas
- **PUT** `/api/notifications/mark-all-read`
- **Headers:** Authorization: Bearer {token}

#### Eliminar Notificación
- **DELETE** `/api/notifications/:id`
- **Headers:** Authorization: Bearer {token}

## Notas Adicionales

- Todas las rutas protegidas requieren el header de autorización con el token JWT
- Las fechas deben enviarse en formato ISO 8601
- El campo `mood` en las entradas diarias debe ser un número entre 1 y 5
- Las notificaciones se generan automáticamente para:
  - Nuevos eventos creados
  - Nuevos posts publicados 