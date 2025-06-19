const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const validarRol = require("../middlewares/validarRol");

// Ruta de prueba protegida
router.get("/", auth, validarRol("admin"), (req, res) => {
  res.json({
    message: "Acceso permitido a ruta protegida ✅",
    usuario: req.user,
  });
});

module.exports = router;
