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
const upload = require("../../middlewares/multer");
const { isValidObjectId } = require("mongoose");
const validarPropiedadPorId = require("../../middlewares/validarPropiedadPorId");

// 📌 Validación básica de formato de ID
const validarId = (req, res, next) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "ID inválido." });
  }
  next();
};

router.use(auth);

// 📋 Listar historiales (todos los roles permitidos)
router.get("/", listarHistoriales);

// 🆕 Crear historial (solo doctor)
router.post(
  "/",
  validarRol("doctor"),
  upload.array("archivos"),
  validarCrearHistorial,
  crearHistorial
);

// ✏️ Editar historial (doctor o asistente con propiedad)
router.put(
  "/:id",
  validarId,
  validarRol("doctor", "asistente"),
  validarPropiedadPorId("historial"),
  upload.array("archivos"),
  validarEditarHistorial,
  editarHistorial
);

// ❌ Eliminar historial (solo admin con propiedad)
router.delete(
  "/:id",
  validarId,
  validarRol("admin"),
  validarPropiedadPorId("historial"),
  eliminarHistorial
);

module.exports = router;
