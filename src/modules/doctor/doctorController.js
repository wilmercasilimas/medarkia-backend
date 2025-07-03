const Doctor = require("./Doctor");
const User = require("../user/User");
const { procesarAvatar } = require("../../helpers/gestorAvatar");
const {
  obtenerPublicIdDesdeUrl,
  eliminarImagen,
} = require("../../helpers/cloudinaryHelper");
const mongoose = require("mongoose");
const logger = require("../../config/logger");

// Crear doctor (y vincular a un usuario existente)
const crearDoctor = async (req, res) => {
  try {
    const { usuario, especialidad, horario_inicio, horario_fin } = req.body;
    if (!usuario || !especialidad) {
      return res
        .status(400)
        .json({ message: "Todos los campos son obligatorios." });
    }

    if (!mongoose.Types.ObjectId.isValid(usuario)) {
      logger.warn(`❗ ID de usuario inválido al crear doctor: ${usuario}`);
      return res.status(400).json({ message: "ID de usuario inválido." });
    }

    const user = await User.findById(usuario);
    if (!user) {
      logger.warn(`❗ Usuario no encontrado al crear doctor: ${usuario}`);
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    const yaEsDoctor = await Doctor.findOne({ usuario });
    if (yaEsDoctor) {
      logger.warn(`❗ Usuario ya es doctor: ${usuario}`);
      return res
        .status(400)
        .json({ message: "Este usuario ya está registrado como doctor." });
    }

    if (req.file) {
      user.avatar = await procesarAvatar(req.file, user.avatar);
      await user.save();
    }

    const nuevoDoctor = new Doctor({
      usuario,
      especialidad,
      horario_inicio,
      horario_fin,
      creado_por: req.user?._id || null,
    });

    await nuevoDoctor.save();
    logger.info(
      `✅ Doctor creado: ${nuevoDoctor._id} por usuario ${req.user?._id}`
    );

    res
      .status(201)
      .json({ message: "Doctor creado correctamente.", doctor: nuevoDoctor });
  } catch (error) {
    logger.error(`❌ Error al crear doctor: ${error.message}`);
    res.status(500).json({ message: "Error al crear doctor." });
  }
};

// Listar todos los doctores
const listarDoctores = async (_req, res) => {
  try {
    const doctores = await Doctor.find()
      .populate("usuario", "-password")
      .populate("especialidad");

    res.json(doctores);
    logger.info("📋 Doctores listados correctamente");
  } catch (error) {
    logger.error(`❌ Error al listar doctores: ${error.message}`);
    res.status(500).json({ message: "Error al obtener la lista de doctores." });
  }
};

// Actualizar doctor
const editarDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.warn(`❗ ID de doctor inválido al editar: ${id}`);
      return res.status(400).json({ message: "ID de doctor inválido." });
    }

    const { especialidad, estado, horario_inicio, horario_fin } = req.body;

    const doctor = await Doctor.findById(id).populate("usuario");
    if (!doctor) {
      logger.warn(`❗ Doctor no encontrado al editar: ${id}`);
      return res.status(404).json({ message: "Doctor no encontrado." });
    }

    // 🔒 Solo el doctor dueño o un admin puede editar este perfil
    const esAdmin = req.user.rol === "admin";
    const esMismoDoctor =
      req.user.rol === "doctor" &&
      doctor.usuario &&
      doctor.usuario._id.toString() === req.user._id.toString();

    if (!esAdmin && !esMismoDoctor) {
      logger.warn("⛔ Acceso denegado para editar a otro doctor.");
      return res
        .status(403)
        .json({
          message: "No tienes permiso para editar este perfil de doctor.",
        });
    }

    // ✅ Aplicar cambios permitidos
    if (especialidad) doctor.especialidad = especialidad;
    if (estado) doctor.estado = estado;
    if (horario_inicio) doctor.horario_inicio = horario_inicio;
    if (horario_fin) doctor.horario_fin = horario_fin;

    doctor.editado_por = req.user?._id || null;

    await doctor.save();
    logger.info(
      `✏️ Doctor editado: ${doctor._id} por usuario ${req.user?._id}`
    );

    res.json({ message: "Doctor actualizado correctamente." });
  } catch (error) {
    logger.error(`❌ Error al actualizar doctor: ${error.message}`);
    res.status(500).json({ message: "Error al actualizar doctor." });
  }
};

// Eliminar doctor y su usuario
const eliminarDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.warn(`❗ ID de doctor inválido al eliminar: ${id}`);
      return res.status(400).json({ message: "ID de doctor inválido." });
    }

    const doctor = await Doctor.findById(id).populate("usuario");
    if (!doctor) {
      logger.warn(`❗ Doctor no encontrado al eliminar: ${id}`);
      return res.status(404).json({ message: "Doctor no encontrado." });
    }

    // 🔐 Solo el admin puede eliminar doctores
    if (req.user.rol !== "admin") {
      logger.warn("⛔ Solo el administrador puede eliminar doctores.");
      return res.status(403).json({
        message: "No tienes permiso para eliminar este perfil de doctor.",
      });
    }

    if (doctor.usuario) {
      const publicId = doctor.usuario.avatar?.public_id;
      if (publicId && !publicId.includes("default")) {
        await eliminarImagen(publicId);
      }

      await User.findByIdAndDelete(doctor.usuario._id);
    }

    await doctor.deleteOne();
    logger.info(`🗑️ Doctor eliminado: ${id} por usuario ${req.user?._id}`);

    res.json({ message: "Doctor eliminado correctamente." });
  } catch (error) {
    logger.error(`❌ Error al eliminar doctor: ${error.message}`);
    res.status(500).json({ message: "Error al eliminar doctor." });
  }
};

const asignarAsistente = async (req, res) => {
  try {
    const doctorId = req.params.id;
    const { asistenteId } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(doctorId) ||
      !mongoose.Types.ObjectId.isValid(asistenteId)
    ) {
      logger.warn(
        `❗ ID inválido al asignar asistente: doctor=${doctorId}, asistente=${asistenteId}`
      );
      return res.status(400).json({ message: "ID inválido." });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      logger.warn(`❗ Doctor no encontrado al asignar asistente: ${doctorId}`);
      return res.status(404).json({ message: "Doctor no encontrado." });
    }

    const asistente = await User.findById(asistenteId);
    if (!asistente || asistente.rol !== "asistente") {
      logger.warn(`❗ Usuario no es asistente válido: ${asistenteId}`);
      return res
        .status(400)
        .json({ message: "El usuario no es un asistente válido." });
    }

    // Evitar duplicados
    if (doctor.asistentes.includes(asistenteId)) {
      logger.warn(
        `❗ Asistente ya asociado al doctor: ${asistenteId} → ${doctorId}`
      );
      return res
        .status(409)
        .json({ message: "El asistente ya está asociado a este doctor." });
    }

    doctor.asistentes.push(asistenteId);
    doctor.editado_por = req.user._id;
    await doctor.save();

    logger.info(`👥 Asistente ${asistenteId} asignado al doctor ${doctorId}`);

    res.json({
      message: "Asistente asignado correctamente al doctor.",
      doctor,
    });
  } catch (error) {
    logger.error(`❌ Error al asignar asistente: ${error.message}`);
    res.status(500).json({ message: "Error al asignar asistente al doctor." });
  }
};

module.exports = {
  crearDoctor,
  listarDoctores,
  editarDoctor,
  eliminarDoctor,
  asignarAsistente,
};
