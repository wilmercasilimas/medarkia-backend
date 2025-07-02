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
const { isValidObjectId } = require("mongoose");

// ✅ Middleware para validar el formato del ID
const validarId = (req, res, next) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "ID inválido." });
  }
  next();
};

// 🔐 Middleware global de autenticación
router.use(auth);

// 📋 Listar pacientes (admin, doctor, asistente)
router.get("/", validarRol("admin", "doctor", "asistente"), listarPacientes);

// 🆕 Crear paciente (solo admin o asistente)
router.post("/", validarRol("admin", "asistente"), validarPaciente, crearPaciente);

// ✏️ Editar paciente (solo admin o asistente)
router.put("/:id", validarRol("admin", "asistente"), validarId, validarPaciente, editarPaciente);

// ❌ Eliminar paciente (solo admin)
router.delete("/:id", validarRol("admin"), validarId, eliminarPaciente);

module.exports = router;
