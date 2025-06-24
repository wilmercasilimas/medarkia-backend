const Especialidad = require("./Especialidad");
const Doctor = require("../doctor/Doctor");
const mongoose = require("mongoose");

// ✅ Crear nueva especialidad (solo admin)
const crearEspecialidad = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;

    const existe = await Especialidad.findOne({ nombre });
    if (existe) {
      return res
        .status(400)
        .json({ message: "Ya existe una especialidad con ese nombre." });
    }

    const nueva = new Especialidad({ nombre, descripcion });
    await nueva.save();

    res.status(201).json({
      message: "Especialidad creada correctamente.",
      especialidad: nueva,
    });
  } catch (error) {
    console.error("Error al crear especialidad:", error);
    res
      .status(500)
      .json({ message: "Error interno al crear la especialidad." });
  }
};

// ✅ Obtener todas las especialidades
const listarEspecialidades = async (_req, res) => {
  try {
    const especialidades = await Especialidad.find().sort({ nombre: 1 });
    res.json(especialidades);
  } catch (error) {
    console.error("Error al listar especialidades:", error);
    res.status(500).json({ message: "Error al obtener las especialidades." });
  }
};

// ✅ Obtener especialidades con doctores adjuntos (pobladas)
const listarEspecialidadesConDoctores = async (_req, res) => {
  try {
    const data = await Doctor.find()
      .populate({
        path: "especialidad",
        select: "nombre",
      })
      .populate({
        path: "usuario",
        select: "nombre apellido estado",
      });

    // Agrupar por especialidad
    const agrupadas = {};

    data.forEach((doc) => {
      const id = doc.especialidad?._id?.toString();
      if (!id) return;

      if (!agrupadas[id]) {
        agrupadas[id] = {
          especialidad: doc.especialidad.nombre,
          id: doc.especialidad._id,
          doctores: [],
        };
      }

      agrupadas[id].doctores.push({
        id: doc._id,
        nombre: doc.usuario?.nombre,
        apellido: doc.usuario?.apellido,
        estado: doc.estado,
      });
    });

    res.json(Object.values(agrupadas));
  } catch (error) {
    console.error("❌ Error al obtener especialidades con doctores:", error);
    res
      .status(500)
      .json({ message: "Error al obtener especialidades detalladas." });
  }
};

// ✅ Editar especialidad (solo admin)
const editarEspecialidad = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID de especialidad inválido." });
    }

    const { nombre, descripcion } = req.body;

    const especialidad = await Especialidad.findById(id);
    if (!especialidad) {
      return res.status(404).json({ message: "Especialidad no encontrada." });
    }

    especialidad.nombre = nombre || especialidad.nombre;
    especialidad.descripcion = descripcion || especialidad.descripcion;

    await especialidad.save();

    res.json({ message: "Especialidad actualizada.", especialidad });
  } catch (error) {
    console.error("Error al editar especialidad:", error);
    res.status(500).json({ message: "Error al editar la especialidad." });
  }
};

// ✅ Eliminar especialidad (solo admin)
const eliminarEspecialidad = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID de especialidad inválido." });
    }

    const especialidad = await Especialidad.findById(id);
    if (!especialidad) {
      return res.status(404).json({ message: "Especialidad no encontrada." });
    }

    await especialidad.deleteOne();
    res.json({ message: "Especialidad eliminada correctamente." });
  } catch (error) {
    console.error("Error al eliminar especialidad:", error);
    res.status(500).json({ message: "Error al eliminar la especialidad." });
  }
};

module.exports = {
  crearEspecialidad,
  listarEspecialidades,
  listarEspecialidadesConDoctores,
  editarEspecialidad,
  eliminarEspecialidad,
};
