# 🗄️ Guía de Base de Datos - MenteSana Server

## 📋 Esquema de Base de Datos

El proyecto utiliza **PostgreSQL** con **Prisma ORM** y cuenta con las siguientes tablas:

### 📊 **Tablas Principales:**
- **`User`** - Usuarios del sistema (con roles: USER, EDITOR, ADMIN)
- **`Post`** - Artículos del blog con categorías e imágenes
- **`Event`** - Eventos con fecha, ubicación e imágenes  
- **`DailyEntry`** - Entradas diarias de estado de ánimo con IA
- **`Notification`** - Sistema de notificaciones para usuarios

---

## 🚀 **Configuración Inicial**

### **1. Primera vez en VPS:**
```bash
# Configurar PostgreSQL y crear base de datos
./setup-db.sh
# o
npm run setup-db
```

Este script:
- ✅ Instala PostgreSQL si no está presente
- ✅ Crea usuario y base de datos
- ✅ Genera archivo .env con configuración
- ✅ Ejecuta migraciones de Prisma
- ✅ Verifica la conexión

### **2. Variables de entorno generadas:**
```env
DATABASE_URL="postgresql://mentesana_user:password@localhost:5432/mentesana_db"
JWT_SECRET="jwt_secret_generado_automaticamente"
OPENAI_API_KEY="sk-your-openai-api-key-here"  # ⚠️ CONFIGURAR MANUALMENTE
PORT=3000
NODE_ENV=production
```

---

## 💾 **Gestión de Backups**

### **Crear backup:**
```bash
./backup-db.sh
# o  
npm run backup-db
```

**Características:**
- 📅 Backup automático con timestamp
- 🗜️ Compresión automática (.gz)
- 🧹 Limpieza automática (mantiene 7 días)
- 📍 Guardado en carpeta `backups/`

### **Restaurar backup:**
```bash
./restore-db.sh backups/mentesana_backup_20240101_120000.sql.gz
# o
npm run restore-db backups/mentesana_backup_20240101_120000.sql.gz
```

**Proceso de restauración:**
- ⚠️ Confirmación antes de proceder
- 💾 Backup automático antes de restaurar
- ⏸️ Pausa la aplicación temporalmente
- 🔄 Restaura los datos
- 🚀 Reinicia la aplicación

---

## 🔄 **Migraciones y Actualizaciones**

### **Cuando hay cambios en schema.prisma:**
```bash
# El script update.sh detecta automáticamente cambios y ejecuta:
npm run db:generate  # Regenera cliente Prisma
npm run db:migrate   # Aplica migraciones
```

### **Comandos manuales disponibles:**
```bash
npm run db:generate  # Regenerar cliente Prisma
npm run db:migrate   # Aplicar migraciones
npm run db:setup     # Setup completo (generate + migrate)
npm run db:reset     # ⚠️ RESETEA toda la DB (desarrollo)
npm run db:studio    # Interfaz web de administración
```

---

## 🛠️ **Comandos Útiles de PostgreSQL**

### **Acceder a PostgreSQL:**
```bash
sudo -u postgres psql

# O directamente a tu base de datos:
psql -U mentesana_user -d mentesana_db -h localhost
```

### **Comandos básicos en psql:**
```sql
-- Listar bases de datos
\l

-- Conectar a base de datos
\c mentesana_db

-- Listar tablas
\dt

-- Describir tabla
\d "User"

-- Ver tamaño de base de datos
SELECT pg_size_pretty(pg_database_size('mentesana_db'));

-- Salir
\q
```

### **Monitoreo de rendimiento:**
```bash
# Ver conexiones activas
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity WHERE datname = 'mentesana_db';"

# Ver tamaño de tablas
sudo -u postgres psql -d mentesana_db -c "SELECT schemaname,tablename,pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size FROM pg_tables WHERE schemaname='public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

---

## 🚨 **Solución de Problemas**

### **Error de conexión:**
```bash
# Verificar estado de PostgreSQL
sudo systemctl status postgresql

# Reiniciar PostgreSQL
sudo systemctl restart postgresql

# Verificar logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### **Error en migraciones:**
```bash
# Ver estado de migraciones
npx prisma migrate status

# Resolver conflictos manualmente
npx prisma migrate resolve --applied <migration_name>

# Reset completo (⚠️ PERDERAS DATOS)
npx prisma migrate reset
```

### **Verificar configuración de Prisma:**
```bash
# Verificar schema
npx prisma validate

# Generar cliente limpio
rm -rf node_modules/.prisma
npm run db:generate
```

---

## 📊 **Monitoreo y Mantenimiento**

### **Script de mantenimiento automático:**
```bash
# Crear cron job para backup diario (ejecutar como root)
crontab -e

# Agregar esta línea para backup diario a las 2 AM:
0 2 * * * cd /path/to/your/app && ./backup-db.sh
```

### **Verificar integridad de datos:**
```bash
# Acceder a Prisma Studio (interfaz web)
npm run db:studio
# Abre en: http://localhost:5555
```

### **Logs de aplicación relacionados con DB:**
```bash
# Filtrar logs de PM2 relacionados con base de datos
pm2 logs mentesana-server | grep -i "database\|prisma\|connection"
```

---

## 🔐 **Seguridad**

### **Configuración recomendada de PostgreSQL:**
```bash
# Editar configuración de PostgreSQL
sudo nano /etc/postgresql/*/main/postgresql.conf

# Configuraciones recomendadas:
listen_addresses = 'localhost'
max_connections = 100
shared_buffers = 256MB
```

### **Backup de configuración:**
```bash
# Backup del archivo .env
cp .env .env.backup.$(date +%Y%m%d)

# Backup de configuración de PostgreSQL
sudo cp /etc/postgresql/*/main/postgresql.conf /etc/postgresql/postgresql.conf.backup
```

---

## 🔧 **Configuración de Producción**

### **Optimizaciones para producción:**
```bash
# Configurar connection pool en schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

# En .env, agregar parámetros de conexión:
DATABASE_URL="postgresql://user:password@localhost:5432/mentesana_db?connection_limit=10&pool_timeout=20"
```

### **Monitoreo de performance:**
```sql
-- Queries más lentas
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Tablas más utilizadas
SELECT schemaname, tablename, n_tup_ins + n_tup_upd + n_tup_del as total_writes
FROM pg_stat_user_tables 
ORDER BY total_writes DESC;
``` 