# 🛡️ Sistema de Rate Limiting - MenteSana API

## 📋 **Resumen del Sistema**

Implementado un **sistema de rate limiting multicapa** que protege la API contra:
- 🚫 **Ataques de fuerza bruta** en autenticación
- 🚫 **Ataques DoS/DDoS** 
- 🚫 **Abuso de endpoints costosos** (IA/estadísticas)
- 🚫 **Spam de operaciones** de escritura

---

## 🎯 **Configuración por Entornos**

### **🟢 DESARROLLO (`NODE_ENV=development`)**
- **Límites PERMISIVOS** para facilitar testing
- **Logging detallado** de violaciones
- **Bypass disponible** con header especial

### **🔒 PRODUCCIÓN (`NODE_ENV=production`)**
- **Límites ESTRICTOS** para máxima seguridad
- **Logging de seguridad** sin datos sensibles
- **Sin bypass** permitido

---

## 📊 **Límites por Tipo de Endpoint**

### **🌐 General (Todas las rutas)**
| Entorno | Límite | Ventana | Descripción |
|---------|--------|---------|-------------|
| Desarrollo | 1000 req | 15 min | Muy permisivo |
| Producción | 100 req | 15 min | Protección estándar |

### **🔐 Autenticación (Login)**
| Entorno | Límite | Ventana | Protección Extra |
|---------|--------|---------|------------------|
| Desarrollo | 100 intentos | 15 min | Slow down después de 20 |
| Producción | **20 intentos** | 15 min | Slow down después de 5 |

**🚨 Protección especial:**
- Limita por `IP + email` específico
- **Slow down progresivo**: +500ms delay por intento extra (máx 10s)
- **Solo cuenta intentos fallidos**

### **📝 Registro de Usuarios**
| Entorno | Límite | Ventana | Razón |
|---------|--------|---------|-------|
| Desarrollo | 20 registros | 1 hora | Testing flexible |
| Producción | **3 registros** | 1 hora | Anti-spam estricto |

### **✍️ Operaciones de Escritura**
| Entorno | Límite | Ventana | Aplica a |
|---------|--------|---------|----------|
| Desarrollo | 200 ops | 10 min | POST, PUT, DELETE, PATCH |
| Producción | **40 ops** | 10 min | Todas las escrituras |

### **🤖 Endpoints con IA (OpenAI)**
| Entorno | Límite | Ventana | Costo |
|---------|--------|---------|--------|
| Desarrollo | 200 calls | 1 hora | Testing generoso |
| Producción | **30 calls** | 1 hora | Control de costos razonable |

**📍 Afecta a:**
- `POST /api/daily-entries` (genera mensaje IA)
- `PUT /api/daily-entries/:id` (regenera mensaje IA)

### **📊 Lectura Pública**
| Entorno | Límite | Ventana | Aplica a |
|---------|--------|---------|----------|
| Desarrollo | 500 req | 10 min | GET endpoints públicos |
| Producción | **200 req** | 10 min | Blog, eventos públicos |

### **👑 Operaciones de Admin**
| Entorno | Límite | Ventana | Aplica a |
|---------|--------|---------|----------|
| Desarrollo | 100 ops | 10 min | Operaciones administrativas |
| Producción | **50 ops** | 10 min | Gestión de contenido, stats |

---

## 🗂️ **Límites por Ruta Específica**

### **🔐 Autenticación (`/api/auth`)**
```
POST /register    → registerLimiter (3/hora prod)
POST /login       → authSlowDown + authLimiter (20/15min prod)
GET  /profile     → generalLimiter solamente
PUT  /edit-profile → generalLimiter solamente
```

### **📝 Blog (`/api/blog`)**
```
GET  /            → publicReadLimiter (200/10min prod)
GET  /:id         → publicReadLimiter (200/10min prod)
POST /            → writeLimiter + adminLimiter (doble protección)
PUT  /:id         → writeLimiter + adminLimiter (doble protección)
DELETE /:id       → writeLimiter + adminLimiter (doble protección)
```

### **📊 Daily Entries (`/api/daily-entries`)**
```
POST /            → aiLimiter + writeLimiter (30 IA/hora + 40 escritura/10min)
PUT  /:id         → aiLimiter + writeLimiter (doble protección)
GET  /            → generalLimiter solamente
GET  /:id         → generalLimiter solamente
DELETE /:id       → writeLimiter solamente
```

### **📅 Eventos (`/api/events`)**
```
GET  /            → publicReadLimiter (200/10min prod)
GET  /event/:id   → publicReadLimiter (200/10min prod)
GET  /upcoming    → publicReadLimiter (200/10min prod)
GET  /past        → publicReadLimiter (200/10min prod)
POST /            → writeLimiter + adminLimiter (doble protección)
PUT  /:id         → writeLimiter + adminLimiter (doble protección)
DELETE /:id       → writeLimiter + adminLimiter (doble protección)
```

### **🔔 Notificaciones (`/api/notifications`)**
```
GET  /            → generalLimiter solamente
GET  /unread-count → generalLimiter solamente
PUT  /:id/read    → writeLimiter (40/10min prod)
PUT  /mark-all-read → writeLimiter (40/10min prod)
DELETE /:id       → writeLimiter (40/10min prod)
```

### **📈 Estadísticas (`/api/stats`)**
```
TODAS las rutas   → adminLimiter (50/10min prod)
```

---

## 🔧 **Headers de Respuesta**

Cada respuesta incluye headers informativos:

### **Headers estándar de Rate Limit:**
```http
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1640995200
RateLimit-Policy: fixed-window
```

### **Headers personalizados:**
```http
X-API-Version: 1.0
X-Rate-Limit-Policy: strict | development
X-Environment: production | development
```

### **Cuando se excede el límite (429):**
```json
{
  "error": "Demasiados intentos de inicio de sesión",
  "message": "Vuelve a intentar en 15 minutos.",
  "retryAfter": 900
}
```

---

## 🚨 **Respuestas de Error**

### **Error 429 - Rate Limit Exceeded**
```json
{
  "error": "Demasiadas peticiones desde esta IP",
  "message": "Intenta de nuevo en 15 minutos",
  "retryAfter": 900
}
```

### **Slow Down en Autenticación**
- **No hay error** inmediato
- **Delay progresivo** en respuesta: 500ms, 1s, 1.5s, etc.
- **Máximo delay:** 20 segundos

---

## 📝 **Logging de Seguridad**

### **Violaciones loggeadas automáticamente:**
```javascript
🚫 Rate limit excedido: {
  ip: "192.168.1.100",
  endpoint: "/api/auth/login",
  method: "POST",
  userAgent: "Mozilla/5.0...",
  timestamp: "2024-01-15T10:30:00.000Z",
  user: "uuid-del-usuario" | "anonymous"
}
```

### **Solo en desarrollo:**
```javascript
🔓 Rate limit bypass activado para desarrollo
```

---

## 🧪 **Testing y Desarrollo**

### **Bypass para desarrollo:**
```javascript
// Agregar header en tus requests de testing
headers: {
  'X-Dev-Bypass': 'true'  // Solo funciona en NODE_ENV=development
}
```

### **Límites en desarrollo son más permisivos:**
- **10-50x más** requests permitidos
- **Logging detallado** de todas las violaciones
- **Bypass disponible** para testing

### **Testing de límites:**
```bash
# Probar rate limiting de login
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done
```

---

## 🛠️ **Configuración Avanzada**

### **Cambiar límites temporalmente:**
```javascript
// En rateLimits.config.js
max: process.env.CUSTOM_RATE_LIMIT || (isDevelopment ? 1000 : 100)
```

### **Whitelist de IPs (si necesitas):**
```javascript
skip: (req) => {
  const whitelist = ['192.168.1.100', '10.0.0.1'];
  return whitelist.includes(req.ip);
}
```

### **Rate limiting por usuario específico:**
```javascript
keyGenerator: (req) => {
  // Para endpoints autenticados, limitar por usuario
  return req.user?.id || req.ip;
}
```

---

## 💡 **Mejores Prácticas**

### **✅ Implementado correctamente:**
- **Múltiples capas** de protección
- **Límites específicos** por tipo de operación
- **Configuración por entorno**
- **Logging de seguridad**
- **Headers informativos**

### **🚧 Para futuras mejoras:**
- **Redis backend** para rate limiting distribuido
- **Whitelist dinámica** de IPs confiables
- **Alertas automáticas** por violaciones excesivas
- **Dashboard de monitoreo** de rate limits

---

## 🔍 **Monitoreo y Debugging**

### **Ver logs de rate limiting:**
```bash
# En el VPS
pm2 logs mentesana-server | grep "Rate limit"

# O filtrar por IP específica
pm2 logs mentesana-server | grep "192.168.1.100"
```

### **Verificar headers en desarrollo:**
```javascript
// En el navegador (DevTools -> Network)
fetch('/api/auth/profile', {
  headers: { 'Authorization': 'Bearer ' + token }
}).then(res => {
  console.log('Rate Limit Remaining:', res.headers.get('RateLimit-Remaining'));
  console.log('Rate Limit Reset:', res.headers.get('RateLimit-Reset'));
});
```

### **Test de endpoints protegidos:**
```bash
# Verificar que rate limiting funciona
curl -I http://localhost:3000/api/stats/general \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Debería mostrar headers RateLimit-*
```

---

## 🎯 **Resultados de Seguridad**

Con este sistema implementado, tu API ahora está protegida contra:

- ✅ **Ataques de fuerza bruta** → Máximo 20 intentos/15min (con slow down)
- ✅ **Abuso de endpoints caros** → IA limitada a 30 calls/hora
- ✅ **Spam de registros** → Máximo 3 registros/hora
- ✅ **Overload de operaciones** → Escritura limitada a 40/10min
- ✅ **Abuso administrativo** → Admin limitado a 50 ops/10min

**¡Tu API está ahora enterprise-ready con protección robusta contra abuso!** 🛡️ 