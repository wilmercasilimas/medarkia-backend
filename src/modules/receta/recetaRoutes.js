const express = require("express");
const router = express.Router();
const {
  crearReceta,
  listarRecetas,
  editarReceta,
  eliminarReceta,
} = require("./recetaController");

const auth = require("../../middlewares/auth");
const validarRol = require("../../middlewares/validarRol");
const upload = require("../../middlewares/multer");
const {
  validarRecetaCreacion,
  validarRecetaEdicion,
} = require("./validarReceta"); // ✅ destructuramos los validadores

// 🔐 Todas las rutas requieren autenticación
router.use(auth);

// 🆕 Crear receta (solo doctor o asistente)
router.post(
  "/",
  validarRol("doctor", "asistente"),
  upload.array("archivos"),
  validarRecetaCreacion, // ⬅ validador estricto
  crearReceta
);

// 📋 Listar recetas (doctor, paciente, admin, asistente)
router.get("/", validarRol("admin", "doctor", "paciente", "asistente"), listarRecetas);

// 🔄 Editar receta (solo doctor que la creó o admin)
router.put(
  "/:id",
  validarRol("admin", "doctor"),
  upload.array("archivos"),
  validarRecetaEdicion, // ⬅ validador flexible
  editarReceta
);

// 🗑️ Eliminar receta (solo admin)
router.delete("/:id", validarRol("admin"), eliminarReceta);

module.exports = router;
