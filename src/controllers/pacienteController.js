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
    if (!nombre || !apellido || !cedula || !sexo || !fecha_nacimiento || !especialidad_asignada) {
      return res.status(400).json({ message: "Faltan campos obligatorios." });
    }

    // Verificar cedula duplicada
    const existe = await Paciente.findOne({ cedula });
    if (existe) {
      return res.status(400).json({ message: "Ya existe un paciente con esta cédula." });
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

module.exports = {
  crearPaciente,
};
