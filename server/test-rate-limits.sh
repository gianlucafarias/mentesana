#!/bin/bash

echo "🧪 Testing Rate Limiting de MenteSana API"
echo "========================================="

# Configuración
API_URL="http://localhost:3000"
TEST_EMAIL="test@example.com"
TEST_PASSWORD="wrongpassword"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_test() {
    echo -e "${BLUE}🔍 Test: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Función para hacer request y mostrar headers de rate limit
test_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local headers=$4
    
    echo -n "   → $method $endpoint: "
    
    if [ -n "$data" ]; then
        if [ -n "$headers" ]; then
            response=$(curl -s -i -X $method "$API_URL$endpoint" \
                -H "Content-Type: application/json" \
                -H "$headers" \
                -d "$data")
        else
            response=$(curl -s -i -X $method "$API_URL$endpoint" \
                -H "Content-Type: application/json" \
                -d "$data")
        fi
    else
        if [ -n "$headers" ]; then
            response=$(curl -s -i -X $method "$API_URL$endpoint" \
                -H "$headers")
        else
            response=$(curl -s -i -X $method "$API_URL$endpoint")
        fi
    fi
    
    # Extraer código de estado
    status_code=$(echo "$response" | head -n1 | awk '{print $2}')
    
    # Extraer headers de rate limit
    remaining=$(echo "$response" | grep -i "ratelimit-remaining" | awk '{print $2}' | tr -d '\r')
    limit=$(echo "$response" | grep -i "ratelimit-limit" | awk '{print $2}' | tr -d '\r')
    reset=$(echo "$response" | grep -i "ratelimit-reset" | awk '{print $2}' | tr -d '\r')
    
    if [ "$status_code" == "429" ]; then
        print_error "Rate limited (429)"
    elif [ "$status_code" -ge "200" ] && [ "$status_code" -lt "300" ]; then
        print_success "OK ($status_code) - Remaining: ${remaining:-N/A}/${limit:-N/A}"
    else
        print_warning "Status: $status_code - Remaining: ${remaining:-N/A}/${limit:-N/A}"
    fi
}

# Test 1: Rate limiting general
print_test "Rate limiting general (debería permitir muchas requests en desarrollo)"
for i in {1..5}; do
    test_request "GET" "/api/blog"
done

echo ""

# Test 2: Rate limiting de autenticación
print_test "Rate limiting de autenticación (debería limitar después de varios intentos)"
for i in {1..8}; do
    echo -n "   Intento $i: "
    start_time=$(date +%s%3N)
    
    response=$(curl -s -w "\n%{http_code}\n%{time_total}" -X POST "$API_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
    
    end_time=$(date +%s%3N)
    
    # Separar respuesta, código y tiempo
    body=$(echo "$response" | head -n -2)
    status_code=$(echo "$response" | tail -n 2 | head -n 1)
    curl_time=$(echo "$response" | tail -n 1)
    
    # Calcular tiempo total
    total_time=$((end_time - start_time))
    
    if [ "$status_code" == "429" ]; then
        print_error "Rate limited (429) - Tiempo: ${total_time}ms"
    else
        print_warning "Status: $status_code - Tiempo: ${total_time}ms (curl: ${curl_time}s)"
    fi
    
    # Pequeña pausa entre requests
    sleep 0.5
done

echo ""

# Test 3: Rate limiting con bypass de desarrollo
print_test "Rate limiting con bypass de desarrollo (solo funciona en NODE_ENV=development)"
for i in {1..3}; do
    test_request "GET" "/api/blog" "" "X-Dev-Bypass: true"
done

echo ""

# Test 4: Headers informativos
print_test "Verificar headers informativos"
echo -n "   → Checking headers: "
headers_response=$(curl -s -I "$API_URL/api/blog")

api_version=$(echo "$headers_response" | grep -i "x-api-version" | awk '{print $2}' | tr -d '\r')
environment=$(echo "$headers_response" | grep -i "x-environment" | awk '{print $2}' | tr -d '\r')
policy=$(echo "$headers_response" | grep -i "x-rate-limit-policy" | awk '{print $2}' | tr -d '\r')

if [ -n "$api_version" ] && [ -n "$environment" ]; then
    print_success "Headers OK - Version: $api_version, Env: $environment, Policy: $policy"
else
    print_warning "Algunos headers faltantes"
fi

echo ""

# Test 5: Endpoint que requiere autenticación
print_test "Endpoint protegido sin autenticación"
test_request "GET" "/api/daily-entries"

echo ""

# Test 6: Endpoint público vs privado
print_test "Comparar endpoint público vs privado"
test_request "GET" "/api/blog" ""
test_request "GET" "/api/auth/profile" ""

echo ""

# Información sobre el entorno
print_test "Información del entorno de testing"
echo -n "   → Detectando entorno: "
env_response=$(curl -s -I "$API_URL/api/blog" | grep -i "x-environment" | awk '{print $2}' | tr -d '\r')

if [ "$env_response" == "development" ]; then
    print_success "Desarrollo - Límites permisivos activos"
    echo "   💡 En desarrollo, los límites son más altos para facilitar testing"
    echo "   💡 Para probar límites estrictos, cambiar NODE_ENV=production"
elif [ "$env_response" == "production" ]; then
    print_warning "Producción - Límites estrictos activos"
    echo "   ⚠️  Cuidado: Estás probando contra límites de producción"
else
    print_error "Entorno desconocido o headers faltantes"
fi

echo ""
echo "🎯 Testing completado!"
echo ""
echo "💡 Consejos:"
echo "   - En desarrollo: Límites altos para facilitar testing"
echo "   - En producción: Límites bajos para máxima seguridad"
echo "   - Usa 'X-Dev-Bypass: true' header solo en desarrollo"
echo "   - Monitorea logs con: pm2 logs | grep 'Rate limit'"

echo ""
echo "📊 Para ver rate limits actuales:"
echo "   curl -I $API_URL/api/blog"
echo "   # Busca headers: RateLimit-Remaining, RateLimit-Limit" 