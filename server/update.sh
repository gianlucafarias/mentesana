#!/bin/bash

echo "🔄 Actualizando MenteSana Server..."

# Hacer backup de .env
echo "💾 Respaldando configuración..."
cp .env .env.backup 2>/dev/null || echo "No se encontró archivo .env"

# Obtener últimos cambios del repositorio
echo "📥 Obteniendo últimos cambios..."
git stash push -m "Backup antes de actualización $(date)"
git pull origin develop

# Verificar si hay cambios en package.json
if git diff HEAD~1 HEAD --name-only | grep -q "package.json"; then
    echo "📦 Detectados cambios en dependencias, reinstalando..."
    npm install --production
fi

# Verificar si hay cambios en schema.prisma
if git diff HEAD~1 HEAD --name-only | grep -q "prisma/schema.prisma"; then
    echo "🗄️ Detectados cambios en base de datos..."
    npm run db:generate
    npm run db:migrate
fi

# Restaurar .env si existe backup
if [ -f ".env.backup" ]; then
    echo "🔧 Restaurando configuración..."
    cp .env.backup .env
    rm .env.backup
fi

# Reiniciar aplicación con PM2
echo "🔄 Reiniciando aplicación..."
pm2 restart mentesana-server

# Mostrar estado
echo "✅ Actualización completada!"
echo "📊 Estado actual:"
pm2 status mentesana-server
pm2 logs mentesana-server --lines 10 