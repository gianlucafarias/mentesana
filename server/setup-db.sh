#!/bin/bash

echo "🗄️ Configurando PostgreSQL para MenteSana..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir en colores
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar si PostgreSQL está instalado
if ! command -v psql &> /dev/null; then
    echo "📦 Instalando PostgreSQL..."
    sudo apt update
    sudo apt install -y postgresql postgresql-contrib
    print_status "PostgreSQL instalado"
else
    print_status "PostgreSQL ya está instalado"
fi

# Iniciar PostgreSQL si no está corriendo
sudo systemctl start postgresql
sudo systemctl enable postgresql
print_status "PostgreSQL iniciado y habilitado"

# Crear base de datos y usuario
echo "👤 Configurando usuario y base de datos..."

# Solicitar datos de configuración
read -p "📝 Nombre de la base de datos [mentesana_db]: " DB_NAME
DB_NAME=${DB_NAME:-mentesana_db}

read -p "👤 Nombre del usuario [mentesana_user]: " DB_USER
DB_USER=${DB_USER:-mentesana_user}

read -s -p "🔐 Contraseña del usuario: " DB_PASSWORD
echo ""

# Crear usuario y base de datos
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || print_warning "Usuario ya existe"
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || print_warning "Base de datos ya existe"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

print_status "Usuario y base de datos configurados"

# Generar URL de conexión
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"

# Crear o actualizar archivo .env
echo "🔧 Configurando variables de entorno..."

# Backup del .env actual si existe
if [ -f ".env" ]; then
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    print_warning "Backup del .env actual creado"
fi

# Crear o actualizar .env
cat > .env << EOF
# Database
DATABASE_URL="$DATABASE_URL"

# JWT (CAMBIAR EN PRODUCCIÓN)
JWT_SECRET="tu_jwt_secret_super_seguro_cambiar_esto_$(openssl rand -hex 16)"

# OpenAI (CONFIGURAR TU API KEY)
OPENAI_API_KEY="sk-your-openai-api-key-here"

# Server
PORT=3000
NODE_ENV=development

# Frontend URL (solo necesario en producción)
# FRONTEND_URL="https://tu-dominio-frontend.com"
EOF

print_status "Archivo .env creado/actualizado"

# Ejecutar migraciones de Prisma
echo "🔄 Ejecutando migraciones de Prisma..."
npm run db:generate
npm run db:migrate

print_status "Migraciones ejecutadas"

# Verificar conexión
echo "🧪 Verificando conexión a la base de datos..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect()
  .then(() => {
    console.log('✅ Conexión a la base de datos exitosa');
    return prisma.\$disconnect();
  })
  .catch((error) => {
    console.error('❌ Error de conexión:', error.message);
    process.exit(1);
  });
"

echo ""
echo "🎉 ¡Configuración de base de datos completada!"
echo ""
echo "📋 Datos de configuración:"
echo "   Base de datos: $DB_NAME"
echo "   Usuario: $DB_USER"
echo "   URL: $DATABASE_URL"
echo ""
print_warning "¡Recuerda configurar tu OPENAI_API_KEY en el archivo .env!" 