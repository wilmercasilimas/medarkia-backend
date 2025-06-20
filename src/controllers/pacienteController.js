const Paciente = require("../models/Paciente");

// Crear nuevo paciente
const crearPaciente = async (req, res) => {
  try {
    const {
      nombre,
      apellido,
      cedula,
      telefono,
      direccion,
      email,
      sexo,
      fecha_nacimiento,
      especialidad_asignada,
      estado,
    } = req.body;

    // Validar obligatorios
    if (
      !nombre ||
      !apellido ||
      !cedula ||
      !sexo ||
      !fecha_nacimiento ||
      !especialidad_asignada
    ) {
      return res.status(400).json({ message: "Faltan campos obligatorios." });
    }

    // Verificar cedula duplicada
    const existe = await Paciente.findOne({ cedula });
    if (existe) {
      return res
        .status(400)
        .json({ message: "Ya existe un paciente con esta cédula." });
    }

    // Crear y guardar
    const nuevo = new Paciente({
      nombre,
      apellido,
      cedula,
      telefono,
      direccion,
      email,
      sexo,
      fecha_nacimiento,
      especialidad_asignada,
      estado,
    });

    await nuevo.save();

    res.status(201).json({ message: "Paciente registrado correctamente." });
  } catch (error) {
    console.error("❌ Error al crear paciente:", error);
    res.status(500).json({ message: "Error al registrar paciente." });
  }
};

// Listar todos los pacientes
const listarPacientes = async (req, res) => {
  try {
    const pacientes = await Paciente.find().sort({ createdAt: -1 });
    res.json(pacientes);
  } catch (error) {
    console.error("❌ Error al listar pacientes:", error);
    res.status(500).json({ message: "Error al obtener pacientes." });
  }
};

const obtenerPacientePorId = async (req, res) => {
  try {
    const { id } = req.params;

    const paciente = await Paciente.findById(id);
    if (!paciente) {
      return res.status(404).json({ message: "Paciente no encontrado." });
    }

    res.json(paciente);
  } catch (error) {
    console.error("❌ Error al obtener paciente:", error);
    res.status(500).json({ message: "Error al obtener paciente por ID." });
  }
};

const editarPaciente = async (req, res) => {
  try {
    const { id } = req.params;

    const paciente = await Paciente.findById(id);
    if (!paciente) {
      return res.status(404).json({ message: "Paciente no encontrado." });
    }

    const {
      nombre,
      apellido,
      cedula,
      telefono,
      direccion,
      email,
      sexo,
      fecha_nacimiento,
      especialidad_asignada,
      estado,
    } = req.body;

    paciente.nombre = nombre ?? paciente.nombre;
    paciente.apellido = apellido ?? paciente.apellido;
    paciente.cedula = cedula ?? paciente.cedula;
    paciente.telefono = telefono ?? paciente.telefono;
    paciente.direccion = direccion ?? paciente.direccion;
    paciente.email = email ?? paciente.email;
    paciente.sexo = sexo ?? paciente.sexo;
    paciente.fecha_nacimiento = fecha_nacimiento ?? paciente.fecha_nacimiento;
    paciente.especialidad_asignada = especialidad_asignada ?? paciente.especialidad_asignada;
    paciente.estado = estado ?? paciente.estado;

    await paciente.save();

    res.json({ message: "Paciente actualizado correctamente." });
  } catch (error) {
    console.error("❌ Error al editar paciente:", error);
    res.status(500).json({ message: "Error al actualizar paciente." });
  }
};

const eliminarPaciente = async (req, res) => {
  try {
    const { id } = req.params;

    const paciente = await Paciente.findById(id);
    if (!paciente) {
      return res.status(404).json({ message: "Paciente no encontrado." });
    }

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
  obtenerPacientePorId,
  editarPaciente,
  eliminarPaciente,
};
