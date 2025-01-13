import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

// Importar rutas
import authRoutes from "./src/routes/auth.routes.js";
import blogRoutes from "./src/routes/blog.routes.js";
import eventRoutes from "./src/routes/event.routes.js";
import dailyEntryRoutes from "./src/routes/dailyEntry.routes.js";

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

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "¡Algo salió mal!" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});

