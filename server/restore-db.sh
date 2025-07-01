#!/bin/bash

echo "🔄 Restaurando base de datos desde backup..."

# Verificar que se proporcione el archivo de backup
if [ -z "$1" ]; then
    echo "❌ Uso: ./restore-db.sh <archivo_backup.sql.gz>"
    echo "📋 Backups disponibles:"
    ls -la backups/mentesana_backup_*.sql.gz 2>/dev/null || echo "   No hay backups disponibles"
    exit 1
fi

BACKUP_FILE=$1

# Verificar que el archivo existe
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Archivo no encontrado: $BACKUP_FILE"
    exit 1
fi

# Obtener configuración de .env
if [ ! -f ".env" ]; then
    echo "❌ Archivo .env no encontrado"
    exit 1
fi

source .env
DB_URL=$DATABASE_URL

# Extraer componentes de la URL
DB_USER=$(echo $DB_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASSWORD=$(echo $DB_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DB_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DB_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DB_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

# Confirmar restauración
echo "⚠️  ADVERTENCIA: Esta operación eliminará todos los datos actuales"
echo "📄 Archivo a restaurar: $BACKUP_FILE"
echo "🗄️  Base de datos: $DB_NAME"
read -p "¿Continuar? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Operación cancelada"
    exit 1
fi

# Parar la aplicación temporalmente
echo "⏸️  Deteniendo aplicación..."
pm2 stop mentesana-server 2>/dev/null || echo "Aplicación no estaba corriendo"

# Crear backup de seguridad antes de restaurar
echo "💾 Creando backup de seguridad..."
./backup-db.sh

# Descomprimir el archivo si está comprimido
if [[ $BACKUP_FILE == *.gz ]]; then
    echo "📦 Descomprimiendo backup..."
    TEMP_FILE="/tmp/restore_temp.sql"
    gunzip -c $BACKUP_FILE > $TEMP_FILE
else
    TEMP_FILE=$BACKUP_FILE
fi

# Restaurar la base de datos
echo "🔄 Restaurando base de datos..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME < $TEMP_FILE

if [ $? -eq 0 ]; then
    echo "✅ Base de datos restaurada exitosamente"
    
    # Limpiar archivo temporal
    if [[ $BACKUP_FILE == *.gz ]]; then
        rm $TEMP_FILE
    fi
    
    # Reiniciar la aplicación
    echo "🚀 Reiniciando aplicación..."
    pm2 start mentesana-server 2>/dev/null || pm2 restart mentesana-server
    
    echo "✅ Restauración completada"
else
    echo "❌ Error al restaurar la base de datos"
    
    # Limpiar archivo temporal en caso de error
    if [[ $BACKUP_FILE == *.gz ]]; then
        rm $TEMP_FILE
    fi
    
    exit 1
fi 