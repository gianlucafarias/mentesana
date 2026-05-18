# 🌐 Configuración de CORS - Desarrollo vs Producción

## 🎯 **¿Cómo funciona nuestra configuración?**

Hemos implementado **CORS dinámico** que se adapta automáticamente al entorno:

### **🟢 En DESARROLLO (`NODE_ENV=development`)**
```javascript
// ✅ PERMITE CUALQUIER ORIGEN
origin: function (origin, callback) {
  if (process.env.NODE_ENV === 'development') {
    return callback(null, true); // Permite todo
  }
}
```

**Esto significa que puedes hacer peticiones desde:**
- ✅ `http://localhost:3000` (tu frontend)
- ✅ `http://localhost:5173` (Vite)
- ✅ `http://127.0.0.1:8080` (cualquier puerto)
- ✅ Postman / Insomnia
- ✅ Extensiones del navegador
- ✅ Aplicaciones móviles
- ✅ **¡Cualquier origen!**

### **🔒 En PRODUCCIÓN (`NODE_ENV=production`)**
```javascript
// 🛡️ SOLO DOMINIOS ESPECÍFICOS
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://mentesana.app',
];
```

**Solo permite peticiones desde dominios autorizados**

---

## 🚀 **Configuración según entorno**

### **📍 Desarrollo Local**

**Archivo `.env` en tu máquina:**
```env
NODE_ENV=development
DATABASE_URL="postgresql://..."
JWT_SECRET="secret_dev"
PORT=3000
# NO necesitas FRONTEND_URL en desarrollo
```

**Comandos para desarrollo:**
```bash
npm run dev          # Usa NODE_ENV=development automáticamente
npm start           # También funciona para dev local
```

### **📍 Producción (VPS)**

**Archivo `.env` en el VPS:**
```env
NODE_ENV=production
DATABASE_URL="postgresql://..."
JWT_SECRET="secret_super_seguro"
PORT=3000
FRONTEND_URL="https://mentesana.app"
```

**Comandos para producción:**
```bash
./deploy.sh         # Automáticamente usa NODE_ENV=production
pm2 start ecosystem.config.js
```

---

## 🧪 **Pruebas en Diferentes Escenarios**

### **✅ Desarrollo Local - Frontend en localhost**
```javascript
fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
// ✅ FUNCIONA - CORS permite cualquier origen
```

### **✅ Desarrollo Local - Postman/Insomnia**
```bash
# Petición desde Postman
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "test@test.com",
  "password": "123456"
}
# ✅ FUNCIONA - Sin problemas de CORS
```

### **✅ Desarrollo Local - Curl**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'
# ✅ FUNCIONA - Sin origin, siempre permitido
```

### **🔒 Producción - Solo dominios autorizados**
```javascript
// Desde https://tu-frontend.com
fetch('https://api.tu-servidor.com/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
// ✅ FUNCIONA - Dominio autorizado

// Desde https://sitio-malicioso.com
// ❌ BLOQUEADO - "No autorizado por política CORS"
```

---

## 🛠️ **Herramientas de Desarrollo**

### **Postman/Insomnia**
- ✅ **Siempre funcionan** en cualquier entorno
- No envían header `Origin`, así que se permiten automáticamente

### **Navegador (localhost)**
- ✅ **Desarrollo:** Cualquier puerto funciona
- 🔒 **Producción:** Solo desde dominios autorizados

### **Aplicaciones móviles**
- ✅ **Siempre funcionan** (no tienen origin)

### **Extensions del navegador**
- ✅ **Desarrollo:** Funcionan sin problemas
- 🔒 **Producción:** Pueden necesitar configuración adicional

---

## 🔧 **Configuración Avanzada**



### **CORS para subdominios:**
```javascript
// Permitir todos los subdominios de tu dominio
origin: function (origin, callback) {
  if (!origin || origin.endsWith('.mentesana.app')) {
    return callback(null, true);
  }
  // ... resto de la lógica
}
```

---

## 🚨 **Troubleshooting**

### **Error: "CORS policy has blocked the request"**

**En desarrollo:**
```bash
# Verificar que NODE_ENV=development
echo $NODE_ENV

# O agregar al .env
NODE_ENV=development
```
