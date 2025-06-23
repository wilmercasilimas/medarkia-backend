const express = require("express");
const router = express.Router();

const {
  crearPaciente,
  listarPacientes,
  editarPaciente,
  eliminarPaciente,
} = require("./pacienteController");

const auth = require("../../middlewares/auth");
const validarRol = require("../../middlewares/validarRol");
const validarPaciente = require("./validarPaciente");

// 🔐 Todas las rutas requieren autenticación
router.use(auth);

// 🆕 Crear paciente (solo admin o asistente)
router.post("/", validarRol("admin", "asistente"), validarPaciente, crearPaciente);

// 📋 Listar todos los pacientes
router.get("/", validarRol("admin", "asistente", "doctor"), listarPacientes);

// 🔄 Editar paciente
router.put("/:id", validarRol("admin", "asistente"), validarPaciente, editarPaciente);

// ❌ Eliminar paciente
router.delete("/:id", validarRol("admin"), eliminarPaciente);

module.exports = router;
