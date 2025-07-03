const express = require("express");
const router = express.Router();

const auth = require("../../middlewares/auth");
const validarRol = require("../../middlewares/validarRol");
const {
  crearBloqueoHorario,
  listarBloqueos,
  editarBloqueo,
  eliminarBloqueo,
} = require("./bloqueoController");

// 🔐 Todas las rutas requieren autenticación
router.use(auth);

// 📌 Registrar bloqueo de horario
// Accesible por doctor, asistente o admin
router.post(
  "/",
  validarRol("doctor", "asistente", "admin"),
  crearBloqueoHorario
);
// 📋 Listar bloqueos con filtros por rol
router.get("/", listarBloqueos);

// ✏️ Editar bloqueo (admin, doctor o asistente vinculado)
router.put("/:id", validarRol("admin", "doctor", "asistente"), editarBloqueo);

// ❌ Eliminar bloqueo (solo admin y doctor)
router.delete("/:id", validarRol("admin", "doctor"), eliminarBloqueo);

module.exports = router;
