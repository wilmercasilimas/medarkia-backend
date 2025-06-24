const express = require("express");
const router = express.Router();

const {
  crearHistorial,
  listarHistoriales,
  editarHistorial,
  eliminarHistorial,
} = require("./historialController");

const auth = require("../../middlewares/auth");
const validarRol = require("../../middlewares/validarRol");
const {
  validarCrearHistorial,
  validarEditarHistorial,
} = require("./validarHistorial"); // 👈 uso de validadores separados

router.use(auth);

// 📋 Listar historiales (accesible para todos los roles)
router.get("/", listarHistoriales);

// 🆕 Crear historial (solo doctor o asistente)
router.post("/", validarRol("doctor", "asistente"), validarCrearHistorial, crearHistorial);

// ✏️ Editar historial (solo doctor o asistente)
router.put("/:id", validarRol("doctor", "asistente"), validarEditarHistorial, editarHistorial);

// ❌ Eliminar historial (solo admin)
router.delete("/:id", validarRol("admin"), eliminarHistorial);

module.exports = router;
