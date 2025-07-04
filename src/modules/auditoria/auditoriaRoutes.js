// 📁 src/modules/auditoria/auditoriaRoutes.js
const express = require("express");
const router = express.Router();

const auth = require("../../middlewares/auth");
const validarRol = require("../../middlewares/validarRol");
const validarAuditoria = require("./validarAuditoria");
const { verAuditoriaHistorial } = require("./auditoriaController");

router.use(auth);

// 🔍 Auditoría de historial clínico
router.get(
  "/historial/:id",
  validarRol("admin", "doctor"),
  validarAuditoria("historial"),
  verAuditoriaHistorial
);

module.exports = router;
