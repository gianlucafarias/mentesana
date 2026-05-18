// EJEMPLO: Configuraciones para diferentes entornos
// No usar este archivo directamente, solo como referencia

export const developmentConfig = {
  // En desarrollo:
  // NODE_ENV=development
  // DATABASE_URL="postgresql://user:pass@localhost:5432/mentesana_dev_db"
  // JWT_SECRET="jwt_secret_desarrollo"
  // PORT=3000
  // FRONTEND_URL no es necesario (CORS permite cualquier origin)
  
  corsEnabled: 'permissive', // Permite cualquier origin
  logLevel: 'debug',
  jwtExpiration: '7d' // Más tiempo en desarrollo
};

export const productionConfig = {
  // En producción:
  // NODE_ENV=production
  // DATABASE_URL="postgresql://user:pass@production-host:5432/mentesana_prod_db"
  // JWT_SECRET="jwt_secret_super_seguro_produccion"
  // PORT=3000
  // FRONTEND_URL="https://mentesana.com"
  
  corsEnabled: 'restrictive', // Solo dominios específicos
  logLevel: 'error',
  jwtExpiration: '24h' // Menos tiempo en producción
};

export const testingConfig = {
  // En testing:
  // NODE_ENV=test
  // DATABASE_URL="postgresql://user:pass@localhost:5432/mentesana_test_db"
  // JWT_SECRET="jwt_secret_testing"
  // PORT=3001
  
  corsEnabled: 'permissive',
  logLevel: 'silent',
  jwtExpiration: '1h'
};

/*
CONFIGURACIONES REALES:

=== DESARROLLO LOCAL (.env) ===
NODE_ENV=development
DATABASE_URL="postgresql://mentesana_user:password@localhost:5432/mentesana_dev_db"
JWT_SECRET="jwt_secret_desarrollo_cambiar_esto"
OPENAI_API_KEY="sk-your-openai-api-key"
PORT=3000

=== PRODUCCIÓN (.env) ===
NODE_ENV=production
DATABASE_URL="postgresql://mentesana_user:secure_password@localhost:5432/mentesana_db"
JWT_SECRET="jwt_secret_super_seguro_generado_automaticamente"
OPENAI_API_KEY="sk-your-production-openai-api-key"
PORT=3000
FRONTEND_URL="https://tu-dominio-frontend.com"

=== STAGING (.env) ===
NODE_ENV=production
DATABASE_URL="postgresql://mentesana_user:password@staging-host:5432/mentesana_staging_db"
JWT_SECRET="jwt_secret_staging"
OPENAI_API_KEY="sk-your-staging-openai-api-key"
PORT=3000
FRONTEND_URL="https://staging.tu-dominio.com"
*/ 