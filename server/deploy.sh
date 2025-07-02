#!/bin/bash

echo "🚀 Iniciando deployment de MenteSana Server..."

# Verificar si existe .env
if [ ! -f ".env" ]; then
    echo "⚠️  No se encontró archivo .env"
    read -p "¿Deseas configurar la base de datos ahora? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ./setup-db.sh
    else
        echo "❌ Configuración de base de datos requerida. Ejecuta ./setup-db.sh"
        exit 1
    fi
fi

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

# Configurar entorno de producción
echo "🔧 Configurando entorno de producción..."
if [ -f ".env" ]; then
    # Cambiar NODE_ENV a production
    sed -i 's/NODE_ENV=development/NODE_ENV=production/' .env
    echo "✅ NODE_ENV configurado como production"
fi

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