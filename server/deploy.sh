#!/bin/bash

echo "🚀 Iniciando deployment de MenteSana Server..."

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install --production

# Configurar base de datos
echo "🗄️ Configurando base de datos..."
npm run db:generate
npm run db:migrate

# Crear directorio de logs si no existe
echo "📝 Creando directorio de logs..."
mkdir -p logs

# Reiniciar aplicación con PM2
echo "🔄 Reiniciando aplicación con PM2..."
pm2 stop mentesana-server 2>/dev/null || true
pm2 delete mentesana-server 2>/dev/null || true
pm2 start ecosystem.config.js

# Guardar configuración PM2
pm2 save
pm2 startup

echo "✅ Deployment completado!"
echo "📊 Estado de PM2:"
pm2 status 