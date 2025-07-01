#!/bin/bash

echo "💾 Creando backup de la base de datos..."

# Obtener configuración de .env
if [ ! -f ".env" ]; then
    echo "❌ Archivo .env no encontrado"
    exit 1
fi

# Extraer información de la DATABASE_URL
source .env
DB_URL=$DATABASE_URL

# Extraer componentes de la URL
DB_USER=$(echo $DB_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASSWORD=$(echo $DB_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DB_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DB_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DB_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

# Crear directorio de backups
mkdir -p backups

# Nombre del archivo de backup con timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backups/mentesana_backup_$TIMESTAMP.sql"

echo "📝 Creando backup: $BACKUP_FILE"

# Crear backup
PGPASSWORD=$DB_PASSWORD pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME > $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo "✅ Backup creado exitosamente: $BACKUP_FILE"
    
    # Comprimir el backup
    gzip $BACKUP_FILE
    echo "🗜️  Backup comprimido: $BACKUP_FILE.gz"
    
    # Limpiar backups antiguos (mantener solo los últimos 7 días)
    find backups/ -name "mentesana_backup_*.sql.gz" -mtime +7 -delete
    echo "🧹 Backups antiguos eliminados"
    
    # Mostrar tamaño del backup
    ls -lh $BACKUP_FILE.gz
else
    echo "❌ Error al crear el backup"
    exit 1
fi 