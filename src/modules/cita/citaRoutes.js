const express = require("express");
const router = express.Router();

const auth = require("../../middlewares/auth");
const validarRol = require("../../middlewares/validarRol");
const validarCita = require("./validarCita");

const {
  crearCita,
  editarCita,
  eliminarCita,
  listarCitas,
} = require("./citaController");

// 🔐 Todas las rutas requieren autenticación
router.use(auth);

// Crear cita (doctor o asistente)
router.post("/", validarRol("doctor", "asistente"), validarCita, crearCita);

// Editar cita
router.put("/:id", validarRol("doctor", "asistente"), validarCita, editarCita);

// Eliminar cita
router.delete("/:id", validarRol("doctor", "asistente", "admin"), eliminarCita);

// Listar citas con filtros
router.get("/", validarRol("doctor", "asistente", "admin", "paciente"), listarCitas);

module.exports = router;
