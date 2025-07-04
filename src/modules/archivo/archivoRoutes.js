// 📁 src/modules/archivo/archivoRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../../middlewares/auth");
const validarRol = require("../../middlewares/validarRol");
const validarArchivo = require("./validarArchivo");
const { descargarArchivo, vistaPreviaArchivo } = require("./archivoController");

router.use(auth);

// 📥 Descarga directa
router.get(
  "/:public_id",
  validarRol("admin", "doctor", "paciente"),
  validarArchivo,
  descargarArchivo
);

// 🖼️ Vista previa/imprimir
router.get(
  "/:public_id/preview",
  validarRol("admin", "doctor", "paciente"),
  validarArchivo,
  vistaPreviaArchivo
);

module.exports = router;
