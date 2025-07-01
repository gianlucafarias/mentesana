# MenteSana Server

Servidor backend para la aplicación MenteSana.

## 🚀 Configuración inicial

### 1. Clonar el repositorio
```bash
git clone <url-del-repo>
cd server
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Crear archivo `.env` en la raíz del proyecto:
```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/mentesana"
JWT_SECRET="tu_jwt_secret_aqui"
OPENAI_API_KEY="tu_openai_api_key_aqui"
```

### 4. Configurar base de datos
```bash
# Opción 1: Setup completo (recomendado para primera vez)
npm run db:setup

# Opción 2: Paso a paso
npm run db:migrate  # Aplica migraciones
npm run db:generate # Genera cliente Prisma
```

## 🔄 Flujo de trabajo diario

### Después de hacer `git pull`:
```bash
# Solo si hay nuevas migraciones
npm run db:setup
```

### Comandos útiles:
```bash
npm run dev          # Iniciar servidor en modo desarrollo
npm run db:studio    # Abrir Prisma Studio (interfaz visual de DB)
npm run db:reset     # Resetear DB (¡CUIDADO! Borra todos los datos)
```

## 📚 API Endpoints

### Autenticación
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/profile` - Obtener perfil (requiere token)

### Blog
- `GET /api/blog` - Obtener todos los posts
- `POST /api/blog` - Crear post (requiere auth)
- `PUT /api/blog/:id` - Actualizar post (requiere auth)
- `DELETE /api/blog/:id` - Eliminar post (requiere auth)

### Eventos
- `GET /api/events` - Obtener todos los eventos
- `GET /api/events/upcoming` - Eventos próximos
- `GET /api/events/past` - Eventos pasados
- `POST /api/events` - Crear evento (requiere auth)
- `PUT /api/events/:id` - Actualizar evento (requiere auth)
- `DELETE /api/events/:id` - Eliminar evento (requiere auth)

### Entradas Diarias
- `GET /api/daily-entries` - Obtener entradas (requiere auth)
- `POST /api/daily-entries` - Crear entrada diaria (requiere auth, máximo 1 por día)
- `GET /api/daily-entries/can-create-today` - Verificar si puede crear entrada hoy
- `PUT /api/daily-entries/:id` - Actualizar entrada (requiere auth)
- `DELETE /api/daily-entries/:id` - Eliminar entrada (requiere auth)

### Notificaciones
- `GET /api/notifications` - Obtener notificaciones (requiere auth)
- `PUT /api/notifications/:id/read` - Marcar como leída (requiere auth)

## ⚠️ Importante para el equipo

1. **Nunca hagas `prisma migrate reset` en producción**
2. **Siempre ejecuta `npm run db:setup` después de hacer pull con nuevas migraciones**
3. **No subas tu archivo `.env` al repositorio**
4. **Si tienes problemas con la DB, consulta con el equipo antes de resetear**

## 🛠️ Tecnologías

- Node.js + Express
- Prisma ORM
- PostgreSQL
- JWT para autenticación
- OpenAI API para mensajes motivacionales 