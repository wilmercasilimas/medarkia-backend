const Doctor = require("./Doctor");
const User = require("../user/User");
const { procesarAvatar } = require("../../helpers/gestorAvatar"); // ✅ Nuevo helper modular
const { obtenerPublicIdDesdeUrl } = require("../../helpers/cloudinaryHelper");

// Crear doctor (y vincular a un usuario existente)
const crearDoctor = async (req, res) => {
  try {
    const { usuario, especialidad } = req.body;

    if (!usuario || !especialidad) {
      return res.status(400).json({ message: "Todos los campos son obligatorios." });
    }

    const user = await User.findById(usuario);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado." });

    const yaEsDoctor = await Doctor.findOne({ usuario });
    if (yaEsDoctor) return res.status(400).json({ message: "Este usuario ya está registrado como doctor." });

    // ✅ Si se envió un nuevo avatar
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

// Eliminar doctor (y su usuario)
// Eliminar doctor
const eliminarDoctor = async (req, res) => {
  try {
    const { id } = req.params;

    const doctor = await Doctor.findById(id).populate("usuario");
    if (!doctor) return res.status(404).json({ message: "Doctor no encontrado." });

    // 🧼 Si hay un usuario vinculado, también eliminar su avatar si aplica
    if (doctor.usuario) {
      const publicId = doctor.usuario.avatar?.public_id;
      if (publicId && !publicId.includes("default")) {
        const { eliminarImagen } = require("../../helpers/cloudinaryHelper");
        await eliminarImagen(publicId);
      }

      // ✅ Eliminar usuario vinculado
      await User.findByIdAndDelete(doctor.usuario._id);
    }

    // ✅ Eliminar doctor
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
