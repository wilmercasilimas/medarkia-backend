const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const conectarDB = require("./src/config/db");
const logger = require("./src/config/logger");
const bloqueoRoutes = require("./src/modules/bloqueos/bloqueoRoutes");


dotenv.config();

const app = express();
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

app.use(express.json());

// Conexión a MongoDB
conectarDB();

// Rutas implementadas
app.use("/api/usuarios", require("./src/modules/user/userRoutes"));
app.use("/api/auth", require("./src/modules/auth/authRoutes"));
app.use("/api/especialidades", require("./src/modules/especialidad/especialidadRoutes"));
app.use("/api/doctores", require("./src/modules/doctor/doctorRoutes"));
app.use("/api/pacientes", require("./src/modules/paciente/pacienteRoutes"));
app.use("/api/citas", require("./src/modules/cita/citaRoutes"));
app.use("/api/historiales", require("./src/modules/historial/historialRoutes"));
app.use("/api/recetas", require("./src/modules/receta/recetaRoutes"));
app.use("/api/bloqueos", bloqueoRoutes);
app.use("/api/auditoria", require("./src/modules/auditoria/auditoriaRoutes"));
app.use("/api/archivos", require("./src/modules/archivo/archivoRoutes"));



// Middleware de errores no capturados (debe ir después de todas las rutas)
app.use((err, req, res, next) => {
  logger.error(`🛑 ${req.method} ${req.originalUrl} → ${err.message}`);
  res.status(500).json({ message: "Error interno del servidor." });
});

// Captura de errores a nivel de proceso
process.on("unhandledRejection", (reason) => {
  logger.error(`🔴 Rechazo no manejado: ${reason}`);
});

process.on("uncaughtException", (err) => {
  logger.error(`🔴 Excepción no capturada: ${err.message}`);
});

// Puerto
const PORT = process.env.PORT;
app.listen(PORT, () => {
  logger.info(`🚀 Servidor corriendo en el puerto ${PORT}`);
});

