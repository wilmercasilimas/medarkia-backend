const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3900;

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas
const authRoutes = require("./src/routes/auth");
app.use("/api/auth", authRoutes);

const rutaProtegida = require("./src/routes/protegida");
app.use("/api/protegida", rutaProtegida);

const pacienteRoutes = require("./src/routes/paciente");
app.use("/api/pacientes", pacienteRoutes);

const especialidadRoutes = require("./src/routes/especialidad");
app.use("/api/especialidades", especialidadRoutes);


// Ruta de prueba
app.get("/api/test", (req, res) => {
  res.json({ message: "Servidor Medarkia activo ✅" });
});

// Conexión a MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Conexión a MongoDB establecida");
    app.listen(PORT, () =>
      console.log(`Servidor corriendo en http://localhost:${PORT}`)
    );
  })
  .catch((error) => {
    console.error("❌ Error al conectar a MongoDB:", error);
  });
