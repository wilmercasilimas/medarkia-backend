const express = require("express");
const router = express.Router();
const { login, registrar } = require("./authController");


// Ruta: POST /api/auth/registro
router.post("/registro", registrar);

// Ruta: POST /api/auth/login
router.post("/login", login);

module.exports = router;
