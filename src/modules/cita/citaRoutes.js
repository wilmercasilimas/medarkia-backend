const express = require("express");
const router = express.Router();

const auth = require("../../middlewares/auth");
const validarRol = require("../../middlewares/validarRol");
const validarCita = require("./validarCita");
const validarPropietarioRecurso = require("../../middlewares/validarPropietario"); // ✅ NUEVO

const {
  crearCita,
  editarCita,
  eliminarCita,
  listarCitas,
  obtenerDisponibilidadDoctor,
  sugerirHorariosDisponibles,
} = require("./citaController");

// 🔐 Todas las rutas requieren autenticación
router.use(auth);

// Crear cita (doctor o asistente)
router.post("/", validarRol("doctor", "asistente"), validarCita, crearCita);

// Editar cita (requiere ser doctor asignado o asistente asociado)
router.put(
  "/:id",
  validarRol("doctor", "asistente"),
  validarPropietarioRecurso("cita"),
  validarCita,
  editarCita
);

// Eliminar cita (requiere ser propietario o admin)
router.delete(
  "/:id",
  validarRol("doctor", "asistente", "admin"),
  validarPropietarioRecurso("cita"),
  eliminarCita
);

// Listar citas con filtros
router.get(
  "/",
  validarRol("doctor", "asistente", "admin", "paciente"),
  listarCitas
);

// 📆 Consulta de disponibilidad horaria del doctor
router.get(
  "/disponibilidad",
  validarRol("asistente", "doctor", "admin"),
  obtenerDisponibilidadDoctor
);

// 🧠 Sugerencias automáticas de horarios disponibles
router.get(
  "/sugerencias",
  validarRol("asistente", "doctor", "admin"),
  sugerirHorariosDisponibles
);

module.exports = router;
