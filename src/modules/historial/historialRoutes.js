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
} = require("./validarHistorial");

const upload = require("../../middlewares/multer"); // 👉 asegúrate que el path sea correcto

router.use(auth);

// 📋 Listar historiales (accesible para todos los roles)
router.get("/", listarHistoriales);

// 🆕 Crear historial (solo doctor o asistente, con archivos)
router.post(
  "/",
  validarRol("doctor", "asistente"),
  upload.array("archivos"),
  validarCrearHistorial,
  crearHistorial
);

// ✏️ Editar historial (solo doctor o asistente, con archivos)
router.put(
  "/:id",
  validarRol("doctor", "asistente"),
  upload.array("archivos"),
  validarEditarHistorial,
  editarHistorial
);

// ❌ Eliminar historial (solo admin)
router.delete("/:id", validarRol("admin"), eliminarHistorial);

module.exports = router;
