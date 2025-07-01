# 🚀 Guía de Deployment - MenteSana Server

## 📋 Flujo de Trabajo Completo

### 1. **Desarrollo Local**
```bash
# Trabajar en tus cambios
git add .
git commit -m "Descripción de cambios"
git push origin develop
```

### 2. **Actualizar en VPS**

#### **Opción A: Actualización Completa (Recomendada)**
```bash
# En el VPS
./update.sh
# o
npm run update
```

#### **Opción B: Actualización Rápida**
```bash
# En el VPS (solo para cambios menores)
./quick-update.sh
# o
npm run quick-update
```

---

## 🛠️ Scripts Disponibles

| Script | Comando | Descripción |
|--------|---------|-------------|
| **Deploy inicial** | `./deploy.sh` | Primera instalación completa |
| **Actualización completa** | `./update.sh` | Actualiza con verificaciones |
| **Actualización rápida** | `./quick-update.sh` | Solo git pull + restart |

---

## 🔄 Cuándo Usar Cada Script

### **Actualización Completa (`update.sh`)** - Usar cuando:
- ✅ Cambios en `package.json` (nuevas dependencias)
- ✅ Cambios en `schema.prisma` (base de datos)
- ✅ Cambios importantes en configuración
- ✅ Primera vez después de mucho tiempo

### **Actualización Rápida (`quick-update.sh`)** - Usar cuando:
- ✅ Solo cambios en código JavaScript
- ✅ Cambios menores en rutas/controladores
- ✅ Actualizaciones frecuentes

---

## 🚨 En Caso de Problemas

### **Ver logs de la aplicación:**
```bash
pm2 logs mentesana-server
```

### **Reiniciar manualmente:**
```bash
pm2 restart mentesana-server
```

### **Ver estado:**
```bash
pm2 status
```

### **Restaurar versión anterior:**
```bash
git stash pop  # Restaurar cambios locales si los hay
git reset --hard HEAD~1  # Volver al commit anterior
pm2 restart mentesana-server
```

---

## 💡 Automatización Avanzada (Opcional)

### **Configurar webhook para auto-deployment:**
```bash
# Instalar webhook listener
sudo npm install -g github-webhook-handler

# Configurar en tu repositorio GitHub:
# Settings > Webhooks > Add webhook
# URL: http://tu-vps-ip:9000/webhook
# Content type: application/json
# Events: push
```

---

## 📝 Checklist Pre-Deployment

- [ ] Código probado localmente
- [ ] Variables de entorno configuradas en VPS
- [ ] Base de datos respaldada (si es cambio crítico)
- [ ] Commit y push realizados
- [ ] Script de actualización seleccionado

---

## 🔐 Variables de Entorno en VPS

Archivo `.env` debe contener:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/mentesana_db"
JWT_SECRET="tu_jwt_secret_muy_seguro"
OPENAI_API_KEY="tu_openai_api_key"
PORT=3000
NODE_ENV=production
``` 