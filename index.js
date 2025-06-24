const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const conectarDB = require("./src/config/db");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Conexión a MongoDB
conectarDB();

// Rutas implementadas
app.use("/api/usuarios", require("./src/modules/user/userRoutes"));
app.use("/api/auth", require("./src/modules/auth/authRoutes"));
app.use(
  "/api/especialidades",
  require("./src/modules/especialidad/especialidadRoutes")
); // ✅ Habilitado
app.use("/api/doctores", require("./src/modules/doctor/doctorRoutes"));
app.use("/api/pacientes", require("./src/modules/paciente/pacienteRoutes"));
app.use("/api/citas", require("./src/modules/cita/citaRoutes"));



// Rutas de configuración inicial (solo para desarrollo)
// Esta ruta es para crear el usuario admin y la especialidad "Medicina General" al
//app.use("/api/setup", require("./src/modules/setup/setupRoutes"));

// Futuras rutas
// app.use("/api/pacientes", require("./src/modules/paciente/pacienteRoutes"));

// Puerto
const PORT = process.env.PORT || 3900;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});
