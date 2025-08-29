import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { prisma } from "./src/config/database.js";
import { errorHandler } from "./src/middlewares/errorHandler.js";
import corsConfig from "./src/config/cors.config.js";
import { generalLimiter, rateLimitHeaders, rateLimitLogger, devBypass } from "./src/config/rateLimits.config.js";

// Importar rutas
import authRoutes from "./src/routes/auth.routes.js";
import blogRoutes from "./src/routes/blog.routes.js";
import eventRoutes from "./src/routes/event.routes.js";
import dailyEntryRoutes from "./src/routes/dailyEntry.routes.js";
import notificationRoutes from "./src/routes/notification.routes.js";
import statsRoutes from "./src/routes/stats.routes.js";
import uploadRoutes from "./src/routes/upload.routes.js";
import userRoutes from "./src/routes/user.routes.js";
import insightRoutes from "./src/routes/insight.routes.js";

dotenv.config();
const app = express();

// Middlewares
app.use(cors(corsConfig));
app.use(express.json({ limit: '10mb' })); // Aumentar límite para requests JSON
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir archivos estáticos (imágenes)
app.use('/uploads', express.static('uploads'));

app.use(devBypass); 
app.use(rateLimitHeaders); // Headers
app.use(rateLimitLogger); // Logging de violaciones
app.use(generalLimiter); // Rate limit general

// Rutas
app.use("/api/auth", authRoutes);
app.use("/api/blog", blogRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/daily-entries", dailyEntryRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/users", userRoutes);
app.use("/api", insightRoutes);

// Manejo de rutas no encontradas
app.all('*', (req, res, next) => {
  const err = new Error(`No se puede encontrar ${req.originalUrl} en el servidor`);
  err.statusCode = 404;
  next(err);
});

// Manejo de errores global
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en el puerto ${PORT} y escuchando en todas las interfaces`);
});

