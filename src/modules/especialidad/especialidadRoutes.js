const express = require("express");
const router = express.Router();

const {
  crearEspecialidad,
  listarEspecialidades,
  listarEspecialidadesConDoctores,
  editarEspecialidad,
  eliminarEspecialidad,
} = require("./especialidadController");

const auth = require("../../middlewares/auth");
const validarRol = require("../../middlewares/validarRol");

// 📌 Ruta base: /api/especialidades

// ✅ Crear nueva especialidad (solo admin)
router.post("/", auth, validarRol("admin"), crearEspecialidad);

// ✅ Listar todas las especialidades (todos los usuarios autenticados)
router.get("/", auth, listarEspecialidades);

// ✅ Listar especialidades con doctores asociados
router.get("/con-doctores", auth, listarEspecialidadesConDoctores);

// ✅ Editar especialidad (solo admin)
router.put("/:id", auth, validarRol("admin"), editarEspecialidad);

// ✅ Eliminar especialidad (solo admin)
router.delete("/:id", auth, validarRol("admin"), eliminarEspecialidad);

module.exports = router;
