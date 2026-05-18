# Sistema de Insights Personalizados - MenteSana

## 📋 Descripción General

El sistema de Insights Personalizados es una funcionalidad avanzada que utiliza Inteligencia Artificial para analizar los patrones de estado de ánimo de los usuarios y generar recomendaciones personalizadas y accionables para mejorar su bienestar mental.

## 🎯 Objetivos del Sistema

- **Análisis Inteligente**: Identificar patrones ocultos en el estado de ánimo del usuario
- **Recomendaciones Personalizadas**: Sugerencias específicas basadas en datos reales
- **Optimización de Tokens**: Generación eficiente sin gastar tokens innecesariamente
- **Insights Accionables**: Recomendaciones que el usuario puede implementar inmediatamente

## 🏗️ Arquitectura del Sistema

### Componentes Principales

1. **InsightController** (`src/controllers/insight.controller.js`)
   - Maneja las peticiones HTTP
   - Verifica elegibilidad del usuario
   - Gestiona la lógica de negocio

2. **InsightService** (`src/services/insight.service.js`)
   - Genera insights usando OpenAI
   - Procesa datos del usuario
   - Maneja fallbacks cuando la IA falla

3. **Script de Batch** (`scripts/generate-insights.js`)
   - Genera insights para múltiples usuarios
   - Optimiza el uso de tokens
   - Se puede ejecutar como cron job

### Base de Datos

```sql
-- Nueva tabla UserInsight
CREATE TABLE "UserInsight" (
  id                TEXT PRIMARY KEY,
  userId            TEXT NOT NULL,
  type              TEXT NOT NULL,
  title             TEXT NOT NULL,
  description       TEXT NOT NULL,
  confidence        REAL NOT NULL,
  actionable        BOOLEAN DEFAULT false,
  actionText        TEXT,
  actionUrl         TEXT,
  insightsData      JSONB,
  lastGenerated     TIMESTAMP DEFAULT NOW(),
  nextGenerationDate TIMESTAMP NOT NULL,
  isActive          BOOLEAN DEFAULT true,
  createdAt         TIMESTAMP DEFAULT NOW(),
  updatedAt         TIMESTAMP DEFAULT NOW()
);
```

## 🚀 Cómo Funciona

### 1. Elegibilidad del Usuario

Un usuario es elegible para insights cuando:
- Tiene **7+ entradas** en los últimos 30 días
- No tiene insights generados en los últimos 7 días
- Su cuenta está activa

### 2. Generación de Insights

#### Proceso Individual
1. Se analizan las estadísticas del usuario (últimos 30 días)
2. Se construye un prompt personalizado para OpenAI
3. Se generan 3-5 insights usando GPT-4o-mini
4. Se almacenan en la base de datos con fecha de próxima generación

#### Proceso Batch
1. Se identifican todos los usuarios elegibles
2. Se procesan en lotes de 3-5 usuarios
3. Se pausa entre lotes para evitar rate limiting
4. Se generan insights para todos simultáneamente

### 3. Tipos de Insights

- **Pattern**: Patrones identificados en el estado de ánimo
- **Recommendation**: Recomendaciones específicas
- **Trend**: Tendencias de mejora/empeoramiento
- **Correlation**: Correlaciones entre diferentes factores

### 4. Sistema de Cache

- Los insights se generan **una sola vez** por usuario
- Se almacenan en la base de datos
- Se regeneran automáticamente cada 7 días
- No se generan en cada refresh de página

## ⚙️ Configuración

### Variables de Entorno

```bash
# .env
OPENAI_API_KEY=tu_api_key_aqui
```

### Dependencias

```bash
npm install openai
```

### Migración de Base de Datos

```bash
# Generar y aplicar la migración
npx prisma migrate dev --name add_user_insights

# Regenerar el cliente de Prisma
npx prisma generate
```

## 📡 Endpoints de la API

### Para Usuarios

```http
GET /api/user/insights
Authorization: Bearer <token>
```

**Respuestas:**
- `200`: Insights disponibles
- `202`: Insights en proceso de generación
- `404`: No hay insights disponibles o usuario no elegible

### Para Administradores

```http
# Generar insights para un usuario específico
POST /api/admin/generate/:userId
Authorization: Bearer <admin_token>

# Generar insights en batch
POST /api/admin/generate-batch
Authorization: Bearer <admin_token>

# Estadísticas del sistema
GET /api/admin/stats
Authorization: Bearer <admin_token>

# Forzar regeneración
POST /api/admin/regenerate/:userId
Authorization: Bearer <admin_token>
```

## 🕐 Programación Automática

### Cron Job (Recomendado)

```bash
# Ejecutar diariamente a las 2:00 AM
0 2 * * * cd /path/to/server && node scripts/generate-insights.js

# Ejecutar cada 3 días a las 3:00 AM
0 3 */3 * * cd /path/to/server && node scripts/generate-insights.js
```

### Ejecución Manual

```bash
# Generar insights para todos los usuarios elegibles
node scripts/generate-insights.js

# Con logging detallado
DEBUG=* node scripts/generate-insights.js
```

## 💰 Optimización de Costos

### Estrategias Implementadas

1. **Modelo Económico**: Uso de GPT-4o-mini en lugar de GPT-4
2. **Límite de Tokens**: Máximo 800 tokens por usuario
3. **Generación Batch**: Procesamiento eficiente de múltiples usuarios
4. **Cache Inteligente**: No regeneración innecesaria
5. **Fallbacks**: Insights básicos cuando la IA falla

### Estimación de Costos

- **GPT-4o-mini**: ~$0.00015 por 1K tokens
- **Por usuario**: ~$0.00012 (800 tokens)
- **100 usuarios**: ~$0.012 por ejecución
- **Ejecución diaria**: ~$0.36 por mes

## 🔍 Monitoreo y Debugging

### Logs del Sistema

```bash
# Ver logs en tiempo real
tail -f server.log | grep "insights"

# Buscar errores específicos
grep "Error generando insights" server.log
```

### Métricas de Rendimiento

- Tasa de éxito de generación
- Tiempo promedio por usuario
- Errores por tipo
- Uso de tokens por ejecución

### Alertas Recomendadas

- Fallos en generación de insights
- Uso excesivo de tokens
- Errores de OpenAI
- Usuarios sin insights por mucho tiempo

## 🧪 Testing

### Pruebas Unitarias

```bash
# Ejecutar tests del controlador
npm test insight.controller.test.js

# Ejecutar tests del servicio
npm test insight.service.test.js
```

### Pruebas de Integración

```bash
# Probar endpoint completo
curl -H "Authorization: Bearer <token>" \
     http://localhost:3000/api/user/insights

# Probar generación batch (admin)
curl -X POST -H "Authorization: Bearer <admin_token>" \
     http://localhost:3000/api/admin/generate-batch
```

## 🚨 Troubleshooting

### Problemas Comunes

1. **Error de OpenAI API Key**
   - Verificar variable de entorno
   - Comprobar límites de la cuenta

2. **Usuarios sin insights**
   - Verificar elegibilidad (7+ entradas)
   - Comprobar estado activo de la cuenta

3. **Rate Limiting**
   - Reducir tamaño del batch
   - Aumentar pausas entre lotes

4. **Errores de Base de Datos**
   - Verificar migraciones aplicadas
   - Comprobar permisos de la base de datos

### Comandos de Debug

```bash
# Verificar estado de la base de datos
npx prisma db push

# Resetear insights de un usuario
npx prisma studio

# Ver logs detallados
DEBUG=prisma:client node scripts/generate-insights.js
```

## 🔮 Futuras Mejoras

### Funcionalidades Planificadas

1. **Insights Temáticos**: Por estación, eventos, etc.
2. **Comparación Social**: Anónima con otros usuarios
3. **Machine Learning**: Modelos personalizados por usuario
4. **Notificaciones Push**: Insights oportunos
5. **Exportación de Datos**: Para análisis externo

### Optimizaciones Técnicas

1. **Redis Cache**: Para insights frecuentemente accedidos
2. **Queue System**: Para procesamiento asíncrono
3. **A/B Testing**: Diferentes tipos de insights
4. **Feedback Loop**: Mejora basada en respuestas del usuario

## 📚 Recursos Adicionales

- [Documentación de OpenAI](https://platform.openai.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Cron Job Examples](https://crontab.guru/)
- [Rate Limiting Best Practices](https://redis.io/docs/manual/rate-limiting/)

## 🤝 Contribución

Para contribuir al sistema de insights:

1. Crear un issue describiendo la mejora
2. Implementar en una rama separada
3. Agregar tests correspondientes
4. Actualizar esta documentación
5. Crear un pull request

---

**Nota**: Este sistema está diseñado para ser eficiente en costos y proporcionar valor real a los usuarios. Cualquier cambio debe considerar el impacto en el uso de tokens de OpenAI.
