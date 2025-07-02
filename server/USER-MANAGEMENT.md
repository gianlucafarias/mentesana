# Sistema de Gestión de Usuarios - Dashboard Admin

Este documento describe el sistema de gestión de usuarios implementado para el dashboard del administrador.

## 🚀 Características Implementadas

### Endpoints Disponibles

#### **GET /api/users**
- **Descripción**: Obtiene todos los usuarios con filtros y paginación
- **Acceso**: Solo administradores
- **Parámetros de consulta**:
  - `page` (opcional): Número de página (default: 1)
  - `limit` (opcional): Usuarios por página (default: 10, max: 100)
  - `search` (opcional): Buscar por nombre, email, localidad o provincia
  - `role` (opcional): Filtrar por rol (USER, EDITOR, ADMIN)
  - `isActive` (opcional): Filtrar por estado (true/false)
- **Respuesta**: Lista de usuarios con conteos de actividad

#### **GET /api/users/stats**
- **Descripción**: Estadísticas generales de usuarios
- **Acceso**: Solo administradores
- **Respuesta**: Total, activos, inactivos, nuevos esta semana, con actividad, distribución por roles

#### **GET /api/users/:id**
- **Descripción**: Obtiene detalles completos de un usuario específico
- **Acceso**: Solo administradores
- **Respuesta**: Información del usuario + estadísticas detalladas + actividad reciente

#### **POST /api/users**
- **Descripción**: Crear nuevo usuario desde el admin
- **Acceso**: Solo administradores
- **Body**: `{ email, password, name, role?, birthDate?, locality?, province? }`
- **Validaciones**: Email válido, contraseña mínimo 6 chars con número, rol válido

#### **PUT /api/users/:id/role**
- **Descripción**: Actualizar rol de usuario
- **Acceso**: Solo administradores
- **Body**: `{ role: 'USER' | 'EDITOR' | 'ADMIN' }`
- **Restricción**: No puedes cambiar tu propio rol

#### **PUT /api/users/:id/status**
- **Descripción**: Activar/desactivar usuario
- **Acceso**: Solo administradores
- **Body**: `{ isActive: true | false }`
- **Restricción**: No puedes desactivar tu propia cuenta

#### **DELETE /api/users/:id**
- **Descripción**: Eliminar usuario permanentemente
- **Acceso**: Solo administradores
- **Restricción**: No puedes eliminar tu propia cuenta

## 🔒 Sistema de Seguridad

### Verificaciones Implementadas
1. **Autenticación requerida**: Todos los endpoints requieren token JWT
2. **Solo administradores**: Middleware `requireAdmin` en todas las rutas
3. **Usuarios activos**: Los usuarios desactivados no pueden hacer login
4. **Verificación en tiempo real**: El middleware verifica que el usuario siga existiendo y activo
5. **Autoprotección**: No puedes modificar/eliminar tu propia cuenta

### Campos de Usuario Actualizados
- **`isActive`**: Campo booleano para activar/desactivar usuarios (default: true)
- Verificación en login y en cada request autenticado

## 📊 Estadísticas Disponibles

### Por Usuario Individual
- **Actividad total**: Suma de posts + eventos + entradas diarias
- **Estado de ánimo promedio**: Basado en entradas diarias
- **Días desde última entrada**: Tiempo desde la última actividad
- **Días desde último login**: Tiempo desde el último inicio de sesión
- **Nunca ha hecho login**: Indica si el usuario nunca se ha logueado
- **Edad de la cuenta**: Días desde registro
- **Conteos detallados**: Posts, eventos, entradas diarias, notificaciones
- **Actividad reciente**: Últimos 30 registros de cada tipo

### Estadísticas Generales
- Total de usuarios registrados
- Usuarios activos vs inactivos
- Nuevos usuarios esta semana
- Usuarios con actividad
- Distribución por roles
- **Estadísticas de Login**:
  - Usuarios que nunca han hecho login
  - Usuarios inactivos última semana
  - Usuarios inactivos último mes
  - Usuarios activos última semana

## 🛠️ Validaciones

Todas las entradas están validadas con express-validator:
- **Emails**: Formato válido
- **Contraseñas**: Mínimo 6 caracteres con al menos un número
- **Roles**: Solo USER, EDITOR, ADMIN permitidos
- **IDs**: Formato UUID válido
- **Paginación**: Límites apropiados
- **Fechas**: Formato ISO8601

## 🗄️ Base de Datos

### Migraciones Aplicadas
- Se agregó el campo `isActive` al modelo User (default: `true`)
- Se agregó el campo `lastLogin` al modelo User (opcional)
- También se agregó soporte para `eventType` en eventos
- **Actualización automática**: El campo `lastLogin` se actualiza cada vez que un usuario inicia sesión

### Estructura del Modelo User
```prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  password      String
  name          String
  birthDate     DateTime?
  locality      String?
  province      String?
  role          RoleType   @default(USER)
  isActive      Boolean    @default(true)  // ✨ Campo para activar/desactivar
  lastLogin     DateTime?  // ✨ Fecha del último login (se actualiza automáticamente)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  // ... relaciones
}
```

## 📝 Ejemplo de Uso

```javascript
// 1. Login como admin (actualiza automáticamente lastLogin)
POST /api/auth/login
{ "email": "admin@test.com", "password": "admin123" }

// 2. Obtener estadísticas con datos de login
GET /api/users/stats
/* Respuesta incluye:
{
  "total": 150,
  "active": 145,
  "loginStats": {
    "neverLoggedIn": 12,
    "inactiveLastWeek": 8,
    "inactiveLastMonth": 25,
    "activeLastWeek": 130
  }
}
*/

// 3. Obtener usuarios con filtros
GET /api/users?page=1&limit=10&search=juan&role=USER&isActive=true

// 4. Ver detalles de usuario con estadísticas de login
GET /api/users/uuid-del-usuario
/* Respuesta incluye:
{
  "user": {
    "lastLogin": "2024-07-02T18:45:30.000Z",
    ...
  },
  "stats": {
    "daysSinceLastLogin": 2,
    "hasNeverLoggedIn": false,
    ...
  }
}
*/

// 5. Cambiar rol
PUT /api/users/uuid-del-usuario/role
{ "role": "EDITOR" }

// 6. Desactivar usuario
PUT /api/users/uuid-del-usuario/status
{ "isActive": false }
```

## ⚡ Pruebas

Ejecuta el script de pruebas:
```bash
node test-user-management.js
```

Nota: Asegúrate de tener un usuario admin configurado antes de ejecutar las pruebas.

## 🔄 Próximas Mejoras Sugeridas

1. **Logs de auditoría**: Registrar cambios de roles y estados
2. **Bulk operations**: Operaciones masivas para múltiples usuarios
3. **Exportar datos**: Funcionalidad para exportar lista de usuarios
4. **Filtros avanzados**: Por fecha de registro, último login, etc.
5. **Dashboard visual**: Gráficos y métricas visuales
6. **Notificaciones**: Alertar cuando se cambia el estado de un usuario 