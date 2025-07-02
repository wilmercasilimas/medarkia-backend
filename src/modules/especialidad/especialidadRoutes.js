const express = require("express");
const router = express.Router();

const {
  crearEspecialidad,
  listarEspecialidades,
  editarEspecialidad,
  eliminarEspecialidad,
  listarEspecialidadesConDoctores
} = require("./especialidadController");

const auth = require("../../middlewares/auth");
const validarRol = require("../../middlewares/validarRol");
const validarEspecialidad = require("./validarEspecialidad");
const { isValidObjectId } = require("mongoose");

// 🛡️ Middleware para validar ID
const validarId = (req, res, next) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "ID inválido." });
  }
  next();
};

// 🔐 Todas las rutas requieren autenticación
router.use(auth);

// 🆕 Crear especialidad (solo admin)
router.post("/", validarRol("admin"), validarEspecialidad, crearEspecialidad);

// 📋 Listar especialidades (todos los roles)
router.get("/", listarEspecialidades);

// ✏️ Editar especialidad (solo admin)
router.put("/:id", validarRol("admin"), validarId, validarEspecialidad, editarEspecialidad);

// 🗑️ Eliminar especialidad (solo admin)
router.delete("/:id", validarRol("admin"), validarId, eliminarEspecialidad);

// ✅ NUEVA RUTA: listar especialidades con doctores
router.get("/con-doctores", validarRol("admin", "doctor", "asistente", "paciente"), listarEspecialidadesConDoctores);
module.exports = router;
