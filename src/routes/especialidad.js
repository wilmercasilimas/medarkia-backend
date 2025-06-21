const express = require("express");
const router = express.Router();

const {
  crearEspecialidad,
  listarEspecialidades,
  editarEspecialidad,
} = require("../controllers/especialidadController");

const auth = require("../middlewares/auth");
const validarRol = require("../middlewares/validarRol");

router.post("/", auth, validarRol("admin"), crearEspecialidad);
router.get("/", auth, validarRol("admin", "doctor"), listarEspecialidades);
router.put("/:id", auth, validarRol("admin"), editarEspecialidad);

module.exports = router;
