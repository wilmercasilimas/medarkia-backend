const Doctor = require("./Doctor");
const User = require("../user/User");
const { procesarAvatar } = require("../../helpers/gestorAvatar");
const { obtenerPublicIdDesdeUrl, eliminarImagen } = require("../../helpers/cloudinaryHelper");
const mongoose = require("mongoose");

// Crear doctor (y vincular a un usuario existente)
const crearDoctor = async (req, res) => {
  try {
    const { usuario, especialidad } = req.body;

    if (!usuario || !especialidad) {
      return res.status(400).json({ message: "Todos los campos son obligatorios." });
    }

    if (!mongoose.Types.ObjectId.isValid(usuario)) {
      return res.status(400).json({ message: "ID de usuario inválido." });
    }

    const user = await User.findById(usuario);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado." });

    const yaEsDoctor = await Doctor.findOne({ usuario });
    if (yaEsDoctor) return res.status(400).json({ message: "Este usuario ya está registrado como doctor." });

    if (req.file) {
      user.avatar = await procesarAvatar(req.file, user.avatar);
      await user.save();
    }

    const nuevoDoctor = new Doctor({
      usuario,
      especialidad,
      creado_por: req.user?._id || null,
    });

    await nuevoDoctor.save();

    res.status(201).json({ message: "Doctor creado correctamente.", doctor: nuevoDoctor });
  } catch (error) {
    console.error("❌ Error al crear doctor:", error);
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
  } catch (error) {
    console.error("❌ Error al listar doctores:", error);
    res.status(500).json({ message: "Error al obtener la lista de doctores." });
  }
};

// Actualizar doctor
const editarDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID de doctor inválido." });
    }

    const { especialidad, estado } = req.body;

    const doctor = await Doctor.findById(id);
    if (!doctor) return res.status(404).json({ message: "Doctor no encontrado." });

    if (especialidad) doctor.especialidad = especialidad;
    if (estado) doctor.estado = estado;

    doctor.editado_por = req.user?._id || null;

    await doctor.save();

    res.json({ message: "Doctor actualizado correctamente." });
  } catch (error) {
    console.error("❌ Error al actualizar doctor:", error);
    res.status(500).json({ message: "Error al actualizar doctor." });
  }
};

// Eliminar doctor y su usuario
const eliminarDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID de doctor inválido." });
    }

    const doctor = await Doctor.findById(id).populate("usuario");
    if (!doctor) return res.status(404).json({ message: "Doctor no encontrado." });

    if (doctor.usuario) {
      const publicId = doctor.usuario.avatar?.public_id;
      if (publicId && !publicId.includes("default")) {
        await eliminarImagen(publicId);
      }

      await User.findByIdAndDelete(doctor.usuario._id);
    }

    await doctor.deleteOne();

    res.json({ message: "Doctor eliminado correctamente." });
  } catch (error) {
    console.error("❌ Error al eliminar doctor:", error);
    res.status(500).json({ message: "Error al eliminar doctor." });
  }
};

module.exports = {
  crearDoctor,
  listarDoctores,
  editarDoctor,
  eliminarDoctor,
};
