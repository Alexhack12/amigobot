const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");

const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const psychologistRoutes = require("./routes/psychologistRoutes");
const chatRoutes = require("./routes/chatRoutes");

dotenv.config();

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

const allowedOrigins = [process.env.FRONTEND_URL];

if (process.env.NODE_ENV !== "production") {
  allowedOrigins.push("http://localhost:5173");
}

const normalizedAllowedOrigins = allowedOrigins
  .filter(Boolean)
  .map((origin) => origin.replace(/\/$/, ""));

app.use(helmet());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      if (normalizedAllowedOrigins.includes(origin.replace(/\/$/, ""))) {
        return callback(null, true);
      }

      return callback(new Error("No permitido por CORS"));
    },
    credentials: false,
  })
);

app.use(express.json({ limit: "32kb", strict: true }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Demasiadas solicitudes. Intenta más tarde." },
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Límite temporal del chat alcanzado. Espera un momento." },
});

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "API de AmigoBot funcionando",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "AmigoBot Backend",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api", apiLimiter);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/psychologists", psychologistRoutes);
app.use("/api/chat", chatLimiter, chatRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Ruta no encontrada." });
});

app.use((err, req, res, next) => {
  console.error("Error no controlado en la API", {
    name: err?.name || "Error",
    path: req.originalUrl,
  });

  res.status(500).json({
    message: "Error interno del servidor.",
  });
});

const PORT = Number(process.env.PORT) || 3001;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor backend corriendo en puerto ${PORT}`);
  });
}

module.exports = { app };
