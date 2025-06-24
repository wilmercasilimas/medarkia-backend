const Cita = require("./Cita");
const Doctor = require("../doctor/Doctor");
const Paciente = require("../paciente/Paciente");
const Especialidad = require("../especialidad/Especialidad");
const { enviarNotificacionCita } = require("./notificarCita");
const mongoose = require("mongoose");
const User = require("../user/User");

// Crear cita
const crearCita = async (req, res) => {
  try {
    const {
      paciente,
      doctor,
      especialidad,
      fecha,
      horaInicio,
      horaFin,
      observaciones,
    } = req.body;

    if (!paciente || !doctor || !fecha || !horaInicio || !horaFin) {
      return res.status(400).json({ message: "Faltan campos obligatorios." });
    }

    if (!mongoose.Types.ObjectId.isValid(paciente) || !mongoose.Types.ObjectId.isValid(doctor)) {
      return res.status(400).json({ message: "ID de paciente o doctor inválido." });
    }

    const fechaObj = new Date(fecha);
    if (isNaN(fechaObj)) {
      return res.status(400).json({ message: "Formato de fecha inválido." });
    }

    const conflicto = await Cita.findOne({
      doctor,
      fecha: fechaObj,
      $or: [{ horaInicio: { $lt: horaFin }, horaFin: { $gt: horaInicio } }],
    });

    if (conflicto) {
      return res
        .status(409)
        .json({ message: "Ya existe una cita en ese horario para el doctor." });
    }

    let especialidadFinal = especialidad;
    if (!especialidad) {
      const doctorObj = await Doctor.findById(doctor);
      if (!doctorObj)
        return res.status(404).json({ message: "Doctor no encontrado." });
      especialidadFinal = doctorObj.especialidad;
    }

    const nuevaCita = new Cita({
      paciente,
      doctor,
      especialidad: especialidadFinal,
      fecha,
      horaInicio,
      horaFin,
      observaciones,
      creado_por: req.user?._id || null,
    });

    await nuevaCita.save();
    await enviarNotificacionCita(nuevaCita);

    res.status(201).json({ message: "Cita creada correctamente.", cita: nuevaCita });
  } catch (error) {
    console.error("❌ Error al crear cita:", error);
    res.status(500).json({ message: "Error al crear cita." });
  }
};

// Editar cita
const editarCita = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID de cita inválido." });
    }

    const { fecha, horaInicio, horaFin, doctor, observaciones, estado } = req.body;

    const cita = await Cita.findById(id);
    if (!cita) return res.status(404).json({ message: "Cita no encontrada." });

    if (doctor || fecha || horaInicio || horaFin) {
      const conflicto = await Cita.findOne({
        _id: { $ne: cita._id },
        doctor: doctor || cita.doctor,
        fecha: fecha || cita.fecha,
        $or: [
          {
            horaInicio: { $lt: horaFin || cita.horaFin },
            horaFin: { $gt: horaInicio || cita.horaInicio },
          },
        ],
      });

      if (conflicto) {
        return res
          .status(409)
          .json({ message: "Ya existe una cita en ese horario para el doctor." });
      }
    }

    cita.fecha = fecha || cita.fecha;
    cita.horaInicio = horaInicio || cita.horaInicio;
    cita.horaFin = horaFin || cita.horaFin;
    cita.doctor = doctor || cita.doctor;
    cita.observaciones = observaciones || cita.observaciones;
    cita.estado = estado || cita.estado;
    cita.editado_por = req.user?._id || null;

    await cita.save();
    await enviarNotificacionCita(cita);

    res.json({ message: "Cita actualizada correctamente." });
  } catch (error) {
    console.error("❌ Error al editar cita:", error);
    res.status(500).json({ message: "Error al editar cita." });
  }
};

// Eliminar cita
const eliminarCita = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID de cita inválido." });
    }

    const cita = await Cita.findById(id);
    if (!cita) return res.status(404).json({ message: "Cita no encontrada." });

    await cita.deleteOne();
    res.json({ message: "Cita eliminada correctamente." });
  } catch (error) {
    console.error("❌ Error al eliminar cita:", error);
    res.status(500).json({ message: "Error al eliminar cita." });
  }
};

// Listar citas con filtros
const listarCitas = async (req, res) => {
  try {
    const { fecha, doctor, cedula, usuario } = req.query;
    const filtro = {};

    if (fecha) {
      const parsedFecha = new Date(fecha);
      if (isNaN(parsedFecha)) {
        return res.status(400).json({ message: "Formato de fecha inválido." });
      }
      filtro.fecha = parsedFecha;
    }

    if (doctor) {
      if (!mongoose.Types.ObjectId.isValid(doctor)) {
        return res.status(400).json({ message: "ID de doctor inválido." });
      }
      filtro.doctor = doctor;
    }

    if (cedula || usuario) {
      let usuarioId = usuario;

      if (cedula) {
        const user = await User.findOne({ cedula }).select("_id");
        if (!user) return res.status(404).json({ message: "Cédula no encontrada." });
        usuarioId = user._id;
      }

      if (!mongoose.Types.ObjectId.isValid(usuarioId)) {
        return res.status(400).json({ message: "ID de usuario inválido." });
      }

      const paciente = await Paciente.findOne({ usuario: usuarioId }).select("_id");
      if (!paciente) return res.status(404).json({ message: "Paciente no encontrado para este usuario." });

      filtro.paciente = paciente._id;
    }

    const citas = await Cita.find(filtro)
      .populate("paciente")
      .populate("doctor")
      .populate("especialidad");

    res.json(citas);
  } catch (error) {
    console.error("❌ Error al listar citas:", error);
    res.status(500).json({ message: "Error al obtener citas." });
  }
};

module.exports = {
  crearCita,
  editarCita,
  eliminarCita,
  listarCitas,
};
