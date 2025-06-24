const Paciente = require("./Paciente");
const User = require("../user/User");
const Doctor = require("../doctor/Doctor");

// Crear paciente (vinculando a un usuario existente)
const crearPaciente = async (req, res) => {
  try {
    const { usuario, doctorAsignado, observaciones } = req.body;

    if (!usuario) {
      return res
        .status(400)
        .json({ message: "El ID del usuario es obligatorio." });
    }

    const user = await User.findById(usuario);
    if (!user)
      return res.status(404).json({ message: "Usuario no encontrado." });

    const yaEsPaciente = await Paciente.findOne({ usuario });
    if (yaEsPaciente) {
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

    res
      .status(201)
      .json({
        message: "Paciente creado correctamente.",
        paciente: nuevoPaciente,
      });
  } catch (error) {
    console.error("❌ Error al crear paciente:", error);
    res.status(500).json({ message: "Error al crear paciente." });
  }
};

// Listar todos los pacientes
const listarPacientes = async (req, res) => {
  try {
    const { nombre, apellido, cedula } = req.query;
    let filtro = {};

    // Si es doctor, restringe los pacientes a los asignados
    if (req.user.rol === "doctor") {
      const doctor = await Doctor.findOne({ usuario: req.user._id });
      if (!doctor)
        return res
          .status(403)
          .json({ message: "No eres un doctor registrado." });
      filtro.doctorAsignado = doctor._id;
    }

    let pacientes = await Paciente.find(filtro)
      .populate("usuario", "-password")
      .populate("doctorAsignado");

    // Filtro adicional por datos del usuario
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
    console.error("❌ Error al listar pacientes:", error);
    res.status(500).json({ message: "Error al listar pacientes." });
  }
};

// Editar paciente
const editarPaciente = async (req, res) => {
  try {
    const { id } = req.params;
    const { doctorAsignado, estado, observaciones } = req.body;

    const paciente = await Paciente.findById(id);
    if (!paciente)
      return res.status(404).json({ message: "Paciente no encontrado." });

    if (doctorAsignado) paciente.doctorAsignado = doctorAsignado;
    if (estado) paciente.estado = estado;
    if (observaciones) paciente.observaciones = observaciones;

    paciente.editado_por = req.user?._id || null;

    await paciente.save();

    res.json({ message: "Paciente actualizado correctamente." });
  } catch (error) {
    console.error("❌ Error al editar paciente:", error);
    res.status(500).json({ message: "Error al editar paciente." });
  }
};

// Eliminar paciente
const eliminarPaciente = async (req, res) => {
  try {
    const { id } = req.params;

    const paciente = await Paciente.findById(id).populate("usuario");
    if (!paciente)
      return res.status(404).json({ message: "Paciente no encontrado." });

    // ⚠️ Si se desea, también puede eliminarse el User relacionado (como en doctorController)
    await paciente.deleteOne();

    res.json({ message: "Paciente eliminado correctamente." });
  } catch (error) {
    console.error("❌ Error al eliminar paciente:", error);
    res.status(500).json({ message: "Error al eliminar paciente." });
  }
};

module.exports = {
  crearPaciente,
  listarPacientes,
  editarPaciente,
  eliminarPaciente,
};
