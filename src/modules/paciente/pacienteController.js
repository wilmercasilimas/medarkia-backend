const mongoose = require("mongoose");
const Paciente = require("./Paciente");
const User = require("../user/User");
const Doctor = require("../doctor/Doctor");
const logger = require("../../config/logger");

// Crear paciente
const crearPaciente = async (req, res) => {
  try {
    const { usuario, doctorAsignado, observaciones } = req.body;

    if (!usuario) {
      logger.warn("⚠️ ID de usuario no proporcionado.");
      return res
        .status(400)
        .json({ message: "El ID del usuario es obligatorio." });
    }

    if (!mongoose.Types.ObjectId.isValid(usuario)) {
      logger.warn("⚠️ ID de usuario inválido.");
      return res.status(400).json({ message: "ID de usuario inválido." });
    }

    const user = await User.findById(usuario);
    if (!user) {
      logger.warn("⚠️ Usuario no encontrado.");
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    const yaEsPaciente = await Paciente.findOne({ usuario });
    if (yaEsPaciente) {
      logger.warn("⚠️ Usuario ya registrado como paciente.");
      return res
        .status(400)
        .json({ message: "Este usuario ya está registrado como paciente." });
    }

    const nuevoPaciente = new Paciente({
      usuario,
      doctorAsignado,
      observaciones,
      creado_por: req.user?._id || null,
    });

    await nuevoPaciente.save();

    logger.info(`✅ Paciente creado: usuario ${usuario}`);

    res.status(201).json({
      message: "Paciente creado correctamente.",
      paciente: nuevoPaciente,
    });
  } catch (error) {
    logger.error(`❌ Error al crear paciente: ${error.message}`);
    res.status(500).json({ message: "Error al crear paciente." });
  }
};

// Listar pacientes
const listarPacientes = async (req, res) => {
  try {
    const { nombre, apellido, cedula } = req.query;
    let filtro = {};

    if (req.user.rol === "doctor") {
      const doctor = await Doctor.findOne({ usuario: req.user._id });
      if (!doctor) {
        logger.warn("⚠️ Doctor no registrado.");
        return res.status(403).json({ message: "Doctor no registrado." });
      }
      filtro.doctorAsignado = doctor._id;
    }

    if (req.user.rol === "asistente") {
      const asistente = await User.findById(req.user._id);
      if (!asistente?.asociado_a) {
        logger.warn("⚠️ Asistente sin doctor asociado.");
        return res
          .status(403)
          .json({ message: "No tienes un doctor asignado." });
      }

      const doctor = await Doctor.findOne({ usuario: asistente.asociado_a });
      if (!doctor) {
        logger.warn("⚠️ Doctor asociado no encontrado.");
        return res
          .status(404)
          .json({ message: "Doctor asociado no encontrado." });
      }

      filtro.doctorAsignado = doctor._id;
    }

    let pacientes = await Paciente.find(filtro)
      .populate("usuario", "-password")
      .populate("doctorAsignado");

    if (nombre || apellido || cedula) {
      pacientes = pacientes.filter(
        (p) =>
          (!nombre ||
            p.usuario?.nombre?.toLowerCase().includes(nombre.toLowerCase())) &&
          (!apellido ||
            p.usuario?.apellido
              ?.toLowerCase()
              .includes(apellido.toLowerCase())) &&
          (!cedula || p.usuario?.cedula === cedula)
      );
    }

    res.json(pacientes);
  } catch (error) {
    logger.error(`❌ Error al listar pacientes: ${error.message}`);
    res.status(500).json({ message: "Error al listar pacientes." });
  }
};

// Editar paciente
const editarPaciente = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.warn("⚠️ ID de paciente inválido.");
      return res.status(400).json({ message: "ID del paciente inválido." });
    }

    const { doctorAsignado, estado, observaciones } = req.body;

    const paciente = await Paciente.findById(id);
    if (!paciente) {
      logger.warn("⚠️ Paciente no encontrado.");
      return res.status(404).json({ message: "Paciente no encontrado." });
    }

    if (doctorAsignado) paciente.doctorAsignado = doctorAsignado;
    if (estado) paciente.estado = estado;
    if (observaciones) paciente.observaciones = observaciones;

    paciente.editado_por = req.user?._id || null;
    await paciente.save();

    logger.info(`✏️ Paciente actualizado: ${id}`);

    res.json({ message: "Paciente actualizado correctamente." });
  } catch (error) {
    logger.error(`❌ Error al editar paciente: ${error.message}`);
    res.status(500).json({ message: "Error al editar paciente." });
  }
};

// Eliminar paciente
const eliminarPaciente = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.warn("⚠️ ID de paciente inválido.");
      return res.status(400).json({ message: "ID del paciente inválido." });
    }

    const paciente = await Paciente.findById(id).populate("usuario");
    if (!paciente) {
      logger.warn("⚠️ Paciente no encontrado para eliminar.");
      return res.status(404).json({ message: "Paciente no encontrado." });
    }

    await paciente.deleteOne();

    logger.info(`🗑️ Paciente eliminado: ${id}`);

    res.json({ message: "Paciente eliminado correctamente." });
  } catch (error) {
    logger.error(`❌ Error al eliminar paciente: ${error.message}`);
    res.status(500).json({ message: "Error al eliminar paciente." });
  }
};

module.exports = {
  crearPaciente,
  listarPacientes,
  editarPaciente,
  eliminarPaciente,
};
