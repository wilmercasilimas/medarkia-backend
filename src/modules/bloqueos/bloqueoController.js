const BloqueoHorario = require("./BloqueoHorario");
const Doctor = require("../doctor/Doctor");
const mongoose = require("mongoose");
const logger = require("../../config/logger");

/**
 * POST /api/bloqueos
 * Crea un nuevo bloqueo de horario para un doctor
 */
const crearBloqueoHorario = async (req, res) => {
  try {
    const { doctor, fecha, horaInicio, horaFin, motivo } = req.body;

    if (!doctor || !fecha || !horaInicio || !horaFin || !motivo) {
      return res
        .status(400)
        .json({ message: "Todos los campos son obligatorios." });
    }

    if (!mongoose.Types.ObjectId.isValid(doctor)) {
      return res.status(400).json({ message: "ID de doctor inválido." });
    }

    const existeDoctor = await Doctor.findById(doctor);
    if (!existeDoctor) {
      return res.status(404).json({ message: "Doctor no encontrado." });
    }

    // 🛑 Validar solapamiento con bloqueos existentes
    const conflicto = await BloqueoHorario.findOne({
      doctor,
      fecha: new Date(fecha),
      $or: [{ horaInicio: { $lt: horaFin }, horaFin: { $gt: horaInicio } }],
    });

    if (conflicto) {
      return res.status(409).json({
        message: "Ya existe un bloqueo para el doctor en ese horario.",
      });
    }

    const nuevoBloqueo = new BloqueoHorario({
      doctor,
      fecha: new Date(fecha),
      horaInicio,
      horaFin,
      motivo,
      creado_por: req.user?._id || null,
    });

    await nuevoBloqueo.save();
    logger.info(`🛑 Bloqueo creado: ${nuevoBloqueo._id} para doctor ${doctor}`);

    res.status(201).json({
      message: "Bloqueo registrado correctamente.",
      bloqueo: nuevoBloqueo,
    });
  } catch (error) {
    logger.error(`❌ Error al crear bloqueo: ${error.message}`);
    res.status(500).json({ message: "Error al crear el bloqueo." });
  }
};

const listarBloqueos = async (req, res) => {
  try {
    const rol = req.user.rol;
    const usuarioId = req.user._id;
    const filtros = {};

    // 🔹 Filtrado por rol
    if (rol === "doctor") {
      const doctor = await Doctor.findOne({ usuario: usuarioId });
      if (!doctor) {
        return res.status(404).json({ message: "Doctor no encontrado." });
      }
      filtros.doctor = doctor._id;
    }

    if (rol === "asistente") {
      const doctor = await Doctor.findOne({ asistente: usuarioId });
      if (!doctor) {
        return res
          .status(404)
          .json({ message: "No estás asignado a un doctor." });
      }
      filtros.doctor = doctor._id;
    }

    // 🔹 Filtros específicos
    if (rol === "admin" && req.query.doctorId) {
      if (!mongoose.Types.ObjectId.isValid(req.query.doctorId)) {
        return res.status(400).json({ message: "ID de doctor inválido." });
      }
      filtros.doctor = req.query.doctorId;
    }

    // 🔹 Filtro de fecha (día completo UTC)
    if (req.query.fecha) {
      const fechaInicio = new Date(req.query.fecha);
      if (isNaN(fechaInicio)) {
        return res.status(400).json({ message: "Formato de fecha inválido." });
      }
      fechaInicio.setUTCHours(0, 0, 0, 0);
      const fechaFin = new Date(fechaInicio);
      fechaFin.setUTCHours(23, 59, 59, 999);
      filtros.fecha = { $gte: fechaInicio, $lte: fechaFin };
    }

    // 🔹 Paginación
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await BloqueoHorario.countDocuments(filtros);
    const bloqueos = await BloqueoHorario.find(filtros)
      .sort({ fecha: -1 })
      .skip(skip)
      .limit(limit);

    res.json({ total, page, limit, bloqueos });
  } catch (error) {
    logger.error(`❌ Error al listar bloqueos: ${error.message}`);
    res.status(500).json({ message: "Error al listar bloqueos." });
  }
};

const editarBloqueo = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, horaInicio, horaFin, motivo } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido." });
    }

    const bloqueo = await BloqueoHorario.findById(id);
    if (!bloqueo) {
      return res.status(404).json({ message: "Bloqueo no encontrado." });
    }

    const rol = req.user.rol;
    const usuarioId = req.user._id;

    if (rol === "doctor") {
      const doctor = await Doctor.findOne({ usuario: usuarioId });
      if (!doctor || bloqueo.doctor.toString() !== doctor._id.toString()) {
        return res.status(403).json({ message: "Sin permiso para editar." });
      }
    }

    if (rol === "asistente") {
      const doctor = await Doctor.findOne({ asistente: usuarioId });
      if (!doctor || bloqueo.doctor.toString() !== doctor._id.toString()) {
        return res.status(403).json({ message: "Sin permiso para editar." });
      }
    }

    // Validar y asignar nueva fecha si viene
    if (fecha) {
      const nuevaFecha = new Date(fecha);
      if (isNaN(nuevaFecha)) {
        return res.status(400).json({ message: "Formato de fecha inválido." });
      }
      nuevaFecha.setUTCHours(0, 0, 0, 0);
      bloqueo.fecha = nuevaFecha;
    }

    if (horaInicio) bloqueo.horaInicio = horaInicio;
    if (horaFin) bloqueo.horaFin = horaFin;
    if (motivo) bloqueo.motivo = motivo;

    // Validar conflicto de horario si se cambia fecha u hora
    if (fecha || horaInicio || horaFin) {
      const conflictos = await BloqueoHorario.find({
        _id: { $ne: id },
        doctor: bloqueo.doctor,
        fecha: bloqueo.fecha,
        $or: [
          {
            horaInicio: { $lt: bloqueo.horaFin },
            horaFin: { $gt: bloqueo.horaInicio },
          },
        ],
      });

      if (conflictos.length > 0) {
        return res.status(409).json({
          message: "Ya existe un bloqueo para el doctor en ese horario.",
        });
      }
    }

    await bloqueo.save();
    logger.info(`✏️ Bloqueo actualizado: ${bloqueo._id}`);
    res.json({ message: "Bloqueo actualizado correctamente." });
  } catch (error) {
    logger.error(`❌ Error al editar bloqueo: ${error.message}`);
    res.status(500).json({ message: "Error al editar bloqueo." });
  }
};

const eliminarBloqueo = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido." });
    }

    const bloqueo = await BloqueoHorario.findById(id);
    if (!bloqueo) {
      return res.status(404).json({ message: "Bloqueo no encontrado." });
    }

    const rol = req.user.rol;
    const usuarioId = req.user._id;

    if (rol === "doctor") {
      const doctor = await Doctor.findOne({ usuario: usuarioId });
      if (!doctor || bloqueo.doctor.toString() !== doctor._id.toString()) {
        return res.status(403).json({ message: "Sin permiso para eliminar." });
      }
    }

    if (rol === "asistente") {
      return res
        .status(403)
        .json({ message: "No tienes permiso para eliminar bloqueos." });
    }

    await bloqueo.deleteOne();
    logger.info(`🗑️ Bloqueo eliminado: ${bloqueo._id}`);
    res.json({ message: "Bloqueo eliminado correctamente." });
  } catch (error) {
    logger.error(`❌ Error al eliminar bloqueo: ${error.message}`);
    res.status(500).json({ message: "Error al eliminar bloqueo." });
  }
};

module.exports = {
  crearBloqueoHorario,
  listarBloqueos,
  editarBloqueo,
  eliminarBloqueo,
};
