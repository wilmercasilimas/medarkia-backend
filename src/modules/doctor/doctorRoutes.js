const express = require("express");
const router = express.Router();

const {
  crearDoctor,
  listarDoctores,
  editarDoctor,
  eliminarDoctor,
  asignarAsistente,
} = require("./doctorController");

const auth = require("../../middlewares/auth");
const validarRol = require("../../middlewares/validarRol");
const validarDoctor = require("./validarDoctor");
const { isValidObjectId } = require("mongoose");

// ✅ Middleware para validar ID en params
const validarId = (req, res, next) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "ID inválido." });
  }
  next();
};

// 🔐 Middleware global de autenticación
router.use(auth);

// 📌 Crear doctor (solo admin)
router.post("/", validarRol("admin"), validarDoctor, crearDoctor);

// 📌 Listar doctores
router.get("/", validarRol("admin"), listarDoctores);

// 📌 Editar doctor
router.put("/:id", validarRol("admin"), validarId, validarDoctor, editarDoctor);

// 📌 Eliminar doctor
router.delete("/:id", validarRol("admin"), validarId, eliminarDoctor);

// 👥 Asignar asistente a un doctor (solo doctor o admin)
router.put(
  "/:id/asignar-asistente",
  validarRol("doctor", "admin"),
  validarId,
  asignarAsistente
);

module.exports = router;
