const Especialidad = require("../models/Especialidad");

// Crear especialidad
const crearEspecialidad = async (req, res) => {
  try {
    const { nombre, descripcion, estado } = req.body;

    if (!nombre) {
      return res.status(400).json({ message: "El nombre es obligatorio." });
    }

    const existe = await Especialidad.findOne({ nombre: nombre.toLowerCase() });
    if (existe) {
      return res.status(400).json({ message: "Ya existe una especialidad con ese nombre." });
    }

    const nuevaEspecialidad = new Especialidad({
      nombre: nombre.toLowerCase(),
      descripcion,
      estado: estado ?? true,
    });

    await nuevaEspecialidad.save();

    res.status(201).json({ message: "Especialidad creada correctamente." });
  } catch (error) {
    console.error("❌ Error al crear especialidad:", error);
    res.status(500).json({ message: "Error al crear especialidad." });
  }
};

// Listar especialidades
const listarEspecialidades = async (req, res) => {
  try {
    const especialidades = await Especialidad.find();
    res.json(especialidades);
  } catch (error) {
    console.error("❌ Error al listar especialidades:", error);
    res.status(500).json({ message: "Error al listar especialidades." });
  }
};

// Editar especialidad
const editarEspecialidad = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, estado } = req.body;

    const especialidad = await Especialidad.findById(id);
    if (!especialidad) {
      return res.status(404).json({ message: "Especialidad no encontrada." });
    }

    if (nombre && nombre.toLowerCase() !== especialidad.nombre) {
      const existe = await Especialidad.findOne({ nombre: nombre.toLowerCase() });
      if (existe) {
        return res.status(400).json({ message: "Ya existe otra especialidad con ese nombre." });
      }
      especialidad.nombre = nombre.toLowerCase();
    }

    especialidad.descripcion = descripcion ?? especialidad.descripcion;
    especialidad.estado = estado ?? especialidad.estado;

    await especialidad.save();

    res.json({ message: "Especialidad actualizada correctamente." });
  } catch (error) {
    console.error("❌ Error al editar especialidad:", error);
    res.status(500).json({ message: "Error al actualizar especialidad." });
  }
};

// Exportación correcta
module.exports = {
  crearEspecialidad,
  listarEspecialidades,
  editarEspecialidad,
};
