const express = require("express");
const router = express.Router();

const {
  crearDoctor,
  listarDoctores,
  editarDoctor,
  eliminarDoctor,
} = require("./doctorController");

const auth = require("../../middlewares/auth");
const validarRol = require("../../middlewares/validarRol");
const validarDoctor = require("./validarDoctor");
const { asignarAsistente } = require("./doctorController");


// 🔐 Middleware global de autenticación
router.use(auth);

// 📌 Crear doctor (solo admin)
router.post("/", validarRol("admin"), validarDoctor, crearDoctor);

// 📌 Listar doctores
router.get("/", validarRol("admin"), listarDoctores);

// 📌 Editar doctor
router.put("/:id", validarRol("admin"), validarDoctor, editarDoctor);

// 📌 Eliminar doctor
router.delete("/:id", validarRol("admin"), eliminarDoctor);

// 👥 Asignar asistente a un doctor (solo doctor o admin)
router.put("/:id/asignar-asistente", validarRol("doctor", "admin"), asignarAsistente);


module.exports = router;
