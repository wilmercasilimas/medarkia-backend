const HistorialClinico = require("./HistorialClinico");
const Paciente = require("../paciente/Paciente");
const Doctor = require("../doctor/Doctor");
const mongoose = require("mongoose");

const crearHistorial = async (req, res) => {
  try {
    const nuevoHistorial = new HistorialClinico({
      ...req.body,
      creado_por: req.user._id,
    });

    await nuevoHistorial.save();
    res.status(201).json({ message: "Historial clínico creado correctamente.", historial: nuevoHistorial });
  } catch (error) {
    console.error("❌ Error al crear historial:", error);
    res.status(500).json({ message: "Error al crear historial." });
  }
};

const listarHistoriales = async (req, res) => {
  try {
    const { paciente, doctor, fechaInicio, fechaFin, texto, page = 1, limit = 10 } = req.query;
    const filtro = {};

    if (req.user.rol === "paciente") {
      const miPaciente = await Paciente.findOne({ usuario: req.user._id });
      if (!miPaciente) return res.status(404).json({ message: "Paciente no encontrado." });
      filtro.paciente = miPaciente._id;
    } else {
      if (paciente) {
        if (!mongoose.Types.ObjectId.isValid(paciente)) {
          return res.status(400).json({ message: "ID de paciente inválido." });
        }
        filtro.paciente = paciente;
      }

      if (doctor) {
        if (!mongoose.Types.ObjectId.isValid(doctor)) {
          return res.status(400).json({ message: "ID de doctor inválido." });
        }
        filtro.doctor = doctor;
      }
    }

    if (fechaInicio || fechaFin) {
      filtro.fecha = {};
      if (fechaInicio) {
        const inicio = new Date(fechaInicio);
        if (isNaN(inicio)) return res.status(400).json({ message: "Formato de fechaInicio inválido (YYYY-MM-DD)." });
        filtro.fecha.$gte = inicio;
      }

      if (fechaFin) {
        const fin = new Date(fechaFin);
        if (isNaN(fin)) return res.status(400).json({ message: "Formato de fechaFin inválido (YYYY-MM-DD)." });
        filtro.fecha.$lte = fin;
      }
    }

    if (texto) {
      filtro.$or = [
        { motivoConsulta: { $regex: texto, $options: "i" } },
        { diagnostico: { $regex: texto, $options: "i" } },
      ];
    }

    const historiales = await HistorialClinico.find(filtro)
      .populate({ path: "paciente", populate: { path: "usuario", select: "-password" } })
      .populate({ path: "doctor", populate: { path: "usuario", select: "-password" } })
      .populate("especialidad")
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json(historiales);
  } catch (error) {
    console.error("❌ Error al listar historiales:", error);
    res.status(500).json({ message: "Error al obtener historiales." });
  }
};

const editarHistorial = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID de historial inválido." });
    }

    const historial = await HistorialClinico.findById(id);
    if (!historial) return res.status(404).json({ message: "Historial no encontrado." });

    // Verificación de propiedad
    if (req.user.rol === "doctor") {
      const doctor = await Doctor.findOne({ usuario: req.user._id });
      if (!doctor || doctor._id.toString() !== historial.doctor.toString()) {
        return res.status(403).json({ message: "No tienes permiso para editar este historial." });
      }
    }

    // Bloqueo si han pasado más de 48h
    const ahora = new Date();
    const diferenciaHoras = (ahora - historial.createdAt) / (1000 * 60 * 60);
    if (diferenciaHoras > 48) {
      return res.status(403).json({ message: "El historial no puede editarse después de 48 horas." });
    }

    Object.assign(historial, req.body);
    historial.editado_por = req.user._id;
    await historial.save();

    res.json({ message: "Historial actualizado correctamente." });
  } catch (error) {
    console.error("❌ Error al editar historial:", error);
    res.status(500).json({ message: "Error al editar historial." });
  }
};

const eliminarHistorial = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID de historial inválido." });
    }

    const historial = await HistorialClinico.findById(id);
    if (!historial) return res.status(404).json({ message: "Historial no encontrado." });

    await historial.deleteOne();
    res.json({ message: "Historial eliminado correctamente." });
  } catch (error) {
    console.error("❌ Error al eliminar historial:", error);
    res.status(500).json({ message: "Error al eliminar historial." });
  }
};

module.exports = {
  crearHistorial,
  listarHistoriales,
  editarHistorial,
  eliminarHistorial,
};
