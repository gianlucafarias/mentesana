// Configuración de CORS según el entorno
const corsConfig = {
  // Orígenes permitidos según el entorno
  origin: function (origin, callback) {
    // En desarrollo: permitir cualquier origin (incluye localhost, postman, etc.)
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // En producción: lista específica de dominios permitidos
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'https://mentesana.app', 
    ].filter(Boolean);

    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`Origen no autorizado: ${origin}`);
      callback(new Error('No autorizado por política CORS'));
    }
  },
  
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-Api-Key'
  ],
  
  optionsSuccessStatus: 200,
  
  maxAge: 86400
};

export default corsConfig; 