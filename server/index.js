import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { errorHandler } from "./src/middlewares/errorHandler.js";

// Importar rutas
import authRoutes from "./src/routes/auth.routes.js";
import blogRoutes from "./src/routes/blog.routes.js";
import eventRoutes from "./src/routes/event.routes.js";
import dailyEntryRoutes from "./src/routes/dailyEntry.routes.js";
import notificationRoutes from "./src/routes/notification.routes.js";

dotenv.config();
const app = express();
export const prisma = new PrismaClient();

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas
app.use("/api/auth", authRoutes);
app.use("/api/blog", blogRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/daily-entries", dailyEntryRoutes);
app.use("/api/notifications", notificationRoutes);

// Manejo de rutas no encontradas
app.all('*', (req, res, next) => {
  const err = new Error(`No se puede encontrar ${req.originalUrl} en el servidor`);
  err.statusCode = 404;
  next(err);
});

// Manejo de errores global
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});

