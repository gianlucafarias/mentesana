import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

// Configuración base según entorno
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// ===== CONFIGURACIONES BASE =====

// Rate limit general para toda la API
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: isDevelopment ? 1000 : 100, // Dev: 1000 req/15min, Prod: 100 req/15min
  message: {
    error: 'Demasiadas peticiones desde esta IP',
    message: 'Intenta de nuevo en 15 minutos',
    retryAfter: 15 * 60
  },
  standardHeaders: true, // Retorna rate limit info en headers `RateLimit-*`
  legacyHeaders: false, // Desactiva headers `X-RateLimit-*`
  skip: (req) => {
    // En desarrollo, skip para rutas de testing
    if (isDevelopment && req.ip === '127.0.0.1') {
      return false; // No hacer skip, aplicar límite igual
    }
    return false;
  }
});

// ===== LIMITADORES ESPECÍFICOS =====

// Rate limit CRÍTICO para autenticación (prevenir brute force)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: isDevelopment ? 100 : 20, // Dev: 100 intentos, Prod: 20 intentos (más realista)
  message: {
    error: 'Demasiados intentos de inicio de sesión',
    message: 'Demasiados intentos desde esta IP. Intenta en 15 minutos.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  // Incrementar tiempo de bloqueo en intentos repetidos
  skipSuccessfulRequests: true, // Solo contar requests fallidos
  skipFailedRequests: false,
  keyGenerator: (req) => {
    // Usar IP + email si está disponible para limitar por usuario específico
    const email = req.body?.email || '';
    return `${req.ip}-${email}`;
  }
});

// Rate limit para registro de usuarios
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: isDevelopment ? 20 : 3, // Dev: 20 registros/hora, Prod: 3 registros/hora
  message: {
    error: 'Demasiados registros desde esta IP',
    message: 'Solo se permiten 3 registros por hora. Intenta más tarde.',
    retryAfter: 60 * 60
  },
  standardHeaders: true
});

// Rate limit para operaciones de escritura (POST, PUT, DELETE)
export const writeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: isDevelopment ? 200 : 40, // Dev: 200 ops, Prod: 40 ops de escritura
  message: {
    error: 'Demasiadas operaciones de escritura',
    message: 'Límite de operaciones alcanzado. Intenta en 10 minutos.',
    retryAfter: 10 * 60
  },
  standardHeaders: true,
  skip: (req) => {
    // Solo aplicar a métodos de escritura
    return !['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
  }
});

// Rate limit para endpoints de IA (OpenAI es costoso)
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: isDevelopment ? 200 : 30, // Dev: 200 calls, Prod: 30 calls de IA por hora
  message: {
    error: 'Límite de consultas de IA alcanzado',
    message: 'Has alcanzado el límite de mensajes generados por IA. Intenta en 1 hora.',
    retryAfter: 60 * 60
  },
  standardHeaders: true,
  keyGenerator: (req) => {
    // Limitar por usuario autenticado si está disponible
    return req.user?.id || req.ip;
  }
});

// ===== SLOW DOWN (Ralentización gradual) =====

// Slow down para autenticación - hace más lenta la respuesta progresivamente
export const authSlowDown = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutos
  delayAfter: isDevelopment ? 20 : 5, // Empezar a ralentizar después de 5 intentos (prod)
  delayMs: () => 500, // Agregar 500ms de delay por cada request adicional (nueva sintaxis v2)
  maxDelayMs: 10000, // Máximo 10 segundos de delay (reducido de 20s)
  skipFailedRequests: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = req.body?.email || '';
    return `${req.ip}-${email}`;
  }
});

// ===== CONFIGURACIONES ESPECIALES =====

// Rate limit muy permisivo para endpoints públicos de lectura
export const publicReadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: isDevelopment ? 500 : 200, // Generoso para lectura pública
  message: {
    error: 'Demasiadas consultas de contenido público',
    message: 'Límite alcanzado. Intenta en 10 minutos.',
    retryAfter: 10 * 60
  },
  standardHeaders: true,
  skip: (req) => {
    // Solo aplicar a GET requests
    return req.method !== 'GET';
  }
});

// Rate limit estricto para operaciones administrativas
export const adminLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos (aumentado de 5)
  max: isDevelopment ? 100 : 50, // Dev: 100 ops, Prod: 50 ops (más usable)
  message: {
    error: 'Límite de operaciones administrativas alcanzado',
    message: 'Demasiadas operaciones administrativas. Intenta en 10 minutos.',
    retryAfter: 10 * 60
  },
  standardHeaders: true,
  keyGenerator: (req) => {
    // Limitar por usuario admin específico
    return req.user?.id || req.ip;
  }
});

// ===== CONFIGURACIONES ADICIONALES =====

// Headers de información sobre rate limiting
export const rateLimitHeaders = (req, res, next) => {
  // Agregar headers informativos sobre rate limiting
  res.set({
    'X-API-Version': '1.0',
    'X-Rate-Limit-Policy': isProduction ? 'strict' : 'development',
    'X-Environment': process.env.NODE_ENV || 'unknown'
  });
  next();
};

// Middleware para logging de rate limit violations
export const rateLimitLogger = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Si es un error de rate limit, loggearlo
    if (res.statusCode === 429) {
      console.warn(`🚫 Rate limit excedido:`, {
        ip: req.ip,
        endpoint: req.path,
        method: req.method,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
        user: req.user?.id || 'anonymous'
      });
    }
    originalSend.call(this, data);
  };
  
  next();
};

// Configuración por defecto para desarrollo
export const devBypass = (req, res, next) => {
  if (isDevelopment && req.get('X-Dev-Bypass') === 'true') {
    console.log('🔓 Rate limit bypass activado para desarrollo');
    return next();
  }
  next();
}; 