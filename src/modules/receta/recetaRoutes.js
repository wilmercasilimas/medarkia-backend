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
} = require("./validarReceta");
const validarPropiedadPorId = require("../../middlewares/validarPropiedadPorId");

router.use(auth);

// 🆕 Crear receta (solo doctor)
router.post(
  "/",
  validarRol("doctor"),
  upload.array("archivos"),
  validarRecetaCreacion,
  crearReceta
);

// 📋 Listar recetas (autorizado para todos los roles)
router.get(
  "/",
  validarRol("admin", "doctor", "paciente", "asistente"),
  listarRecetas
);

// ✏️ Editar receta (solo doctor creador o admin)
router.put(
  "/:id",
  validarRol("admin", "doctor"),
  validarPropiedadPorId("receta"),
  upload.array("archivos"),
  validarRecetaEdicion,
  editarReceta
);

// ❌ Eliminar receta (solo admin con propiedad)
router.delete(
  "/:id",
  validarRol("admin"),
  validarPropiedadPorId("receta"),
  eliminarReceta
);

module.exports = router;
