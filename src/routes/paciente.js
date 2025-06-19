const express = require("express");
const router = express.Router();
const { crearPaciente } = require("../controllers/pacienteController");

const auth = require("../middlewares/auth");
const validarRol = require("../middlewares/validarRol");

// Crear paciente (solo admin o doctor)
router.post("/", auth, validarRol("admin", "doctor"), crearPaciente);

module.exports = router;
