const express = require("express");
const router = express.Router();
const { crearPaciente, listarPacientes, obtenerPacientePorId, editarPaciente, eliminarPaciente } = require("../controllers/pacienteController");


const auth = require("../middlewares/auth");
const validarRol = require("../middlewares/validarRol");

// Crear paciente (solo admin o doctor)
router.post("/", auth, validarRol("admin", "doctor"), crearPaciente);
// Listar pacientes (cualquier usuario autenticado)
router.get("/", auth, validarRol("admin", "doctor"), listarPacientes);

// Obtener paciente por ID (cualquier usuario autenticado)
router.get("/:id", auth, validarRol("admin", "doctor"), obtenerPacientePorId);

// Editar paciente (solo admin o doctor)
router.put("/:id", auth, validarRol("admin", "doctor"), editarPaciente);

// Eliminar paciente (solo admin)
router.delete("/:id", auth, validarRol("admin"), eliminarPaciente);



module.exports = router;
