const Cita = require("./Cita");
const Doctor = require("../doctor/Doctor");
const Paciente = require("../paciente/Paciente");
const Especialidad = require("../especialidad/Especialidad");
const { enviarEmail } = require("../../helpers/emailHelper");
const { enviarWhatsapp } = require("../../helpers/whatsappHelper");
const BloqueoHorario = require("../bloqueos/BloqueoHorario");
const logger = require("../../config/logger");
const {
  generarIntervalos,
  filtrarHorariosOcupados,
} = require("../../helpers/agendaHelper");
const mongoose = require("mongoose");
const User = require("../user/User");

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

    if (
      !mongoose.Types.ObjectId.isValid(paciente) ||
      !mongoose.Types.ObjectId.isValid(doctor)
    ) {
      return res
        .status(400)
        .json({ message: "ID de paciente o doctor inválido." });
    }

    const fechaObj = new Date(fecha);
    if (isNaN(fechaObj)) {
      return res.status(400).json({ message: "Formato de fecha inválido." });
    }

    // 🔴 Validar conflicto con otra cita
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

    // 🔴 Validar conflicto con bloqueos de agenda
    const bloqueos = await BloqueoHorario.find({
      doctor,
      fecha: fechaObj,
    });

    const conflictoBloqueo = bloqueos.some((b) => {
      if (!b.horaInicio || !b.horaFin) return false;
      return horaInicio < b.horaFin && horaFin > b.horaInicio;
    });

    if (conflictoBloqueo) {
      return res
        .status(409)
        .json({ message: "Este horario está bloqueado para el doctor." });
    }

    // ✅ Resolver especialidad si no se envió
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

    // 🔔 Notificaciones
    const pacientePop = await Paciente.findById(paciente).populate("usuario");
    const doctorPop = await Doctor.findById(doctor).populate("usuario");
    const especialidadPop = await Especialidad.findById(especialidadFinal);

    const pacienteNombre = pacientePop?.usuario
      ? `${pacientePop.usuario.nombre} ${pacientePop.usuario.apellido}`
      : "-";
    const doctorNombre = doctorPop?.usuario
      ? `${doctorPop.usuario.nombre} ${doctorPop.usuario.apellido}`
      : "-";
    const telefonoDoctor = doctorPop?.usuario?.telefono || "-";
    const emailDoctor = doctorPop?.usuario?.email || null;
    const emailPaciente = pacientePop?.usuario?.email || null;
    const telPaciente = pacientePop?.usuario?.telefono || null;
    const especialidadNombre = especialidadPop?.nombre || "-";

    const fechaTexto = new Date(fecha).toLocaleDateString("es-VE", {
      timeZone: "UTC",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const horaTexto = new Date(`1970-01-01T${horaInicio}`).toLocaleTimeString(
      "es-VE",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );

    const mensaje = `Sr. (a): ${pacienteNombre}\n\n📅 Se ha agendado una cita médica para el ${fechaTexto} a las ${horaTexto}.\nDoctor: (a) ${doctorNombre}\nEspecialidad: ${especialidadNombre}\n\n📋 Observaciones: ${
      observaciones || "-"
    }\n\n\n📞 Contacto del doctor: ${telefonoDoctor}`;

    if (emailPaciente)
      await enviarEmail(emailPaciente, "Nueva cita médica agendada", mensaje);
    if (telPaciente) await enviarWhatsapp(telPaciente, mensaje);
    if (emailDoctor)
      await enviarEmail(emailDoctor, "Nueva cita registrada", mensaje);
    if (telefonoDoctor) await enviarWhatsapp(telefonoDoctor, mensaje);

    res
      .status(201)
      .json({ message: "Cita creada correctamente.", cita: nuevaCita });
  } catch (error) {
    logger.error("❌ Error al crear cita: " + error.message);
    res.status(500).json({ message: "Error al crear cita." });
  }
};

const editarCita = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID de cita inválido." });
    }

    const { fecha, horaInicio, horaFin, doctor, observaciones, estado } =
      req.body;

    const cita = await Cita.findById(id);
    if (!cita) return res.status(404).json({ message: "Cita no encontrada." });

    // Validación defensiva del nuevo doctor (si se está cambiando)
    if (doctor) {
      if (!mongoose.Types.ObjectId.isValid(doctor)) {
        return res.status(400).json({ message: "ID de doctor inválido." });
      }
      const existeDoctor = await Doctor.findById(doctor);
      if (!existeDoctor) {
        return res.status(404).json({ message: "Doctor no encontrado." });
      }
    }

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
        return res.status(409).json({
          message: "Ya existe una cita en ese horario para el doctor.",
        });
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

    const pacientePop = await Paciente.findById(cita.paciente).populate(
      "usuario"
    );
    const doctorPop = await Doctor.findById(cita.doctor).populate("usuario");
    const especialidadPop = await Especialidad.findById(cita.especialidad);

    const pacienteNombre = pacientePop?.usuario
      ? `${pacientePop.usuario.nombre} ${pacientePop.usuario.apellido}`
      : "-";

    const doctorNombre = doctorPop?.usuario
      ? `${doctorPop.usuario.nombre} ${doctorPop.usuario.apellido}`
      : "-";

    const telefonoDoctor = doctorPop?.usuario?.telefono || "-";
    const emailDoctor = doctorPop?.usuario?.email || null;
    const emailPaciente = pacientePop?.usuario?.email || null;
    const telPaciente = pacientePop?.usuario?.telefono || null;
    const especialidadNombre = especialidadPop?.nombre || "-";

    const fechaTexto = new Date(fecha).toLocaleDateString("es-VE", {
      timeZone: "UTC",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const horaTexto = new Date(
      `1970-01-01T${cita.horaInicio}`
    ).toLocaleTimeString("es-VE", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const mensaje = `Sr. (a): ${pacienteNombre}\n\n✏️ Se ha actualizado una cita médica para el ${fechaTexto} a las ${horaTexto}.\nDoctor: (a) ${doctorNombre}\nEspecialidad: ${especialidadNombre}\n\n📋 Observaciones: ${
      cita.observaciones || "-"
    }\n\n\n📞 Contacto del doctor: ${telefonoDoctor}`;

    if (emailPaciente)
      await enviarEmail(emailPaciente, "Cita médica actualizada", mensaje);
    if (telPaciente) await enviarWhatsapp(telPaciente, mensaje);
    if (emailDoctor)
      await enviarEmail(emailDoctor, "Cita médica actualizada", mensaje);
    if (telefonoDoctor) await enviarWhatsapp(telefonoDoctor, mensaje);

    res.json({ message: "Cita actualizada correctamente." });
  } catch (error) {
    logger.error("❌ Error al editar cita: " + error.message);
    res.status(500).json({ message: "Error al editar cita." });
  }
};

const eliminarCita = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID de cita inválido." });
    }

    const cita = await Cita.findById(id);
    if (!cita) {
      return res.status(404).json({ message: "Cita no encontrada." });
    }

    await cita.deleteOne();

    // 🗑️ Log de eliminación
    logger.info(`🗑️ Cita eliminada con ID ${id}`);

    res.json({ message: "Cita eliminada correctamente." });
  } catch (error) {
    logger.error("❌ Error al eliminar cita: " + error.message);
    res.status(500).json({ message: "Error al eliminar cita." });
  }
};

const listarCitas = async (req, res) => {
  try {
    const { fecha, doctor, cedula, usuario } = req.query;
    const filtro = {};

    // Filtro por fecha
    if (fecha) {
      const parsedFecha = new Date(fecha);
      if (isNaN(parsedFecha)) {
        logger.warn(`⚠️ Formato de fecha inválido recibido: ${fecha}`);
        return res.status(400).json({ message: "Formato de fecha inválido." });
      }

      const inicioDia = new Date(parsedFecha.setHours(0, 0, 0, 0));
      const finDia = new Date(parsedFecha.setHours(23, 59, 59, 999));
      filtro.fecha = { $gte: inicioDia, $lte: finDia };
    }

    // Filtro por usuario o cédula (paciente)
    if (cedula || usuario) {
      let usuarioId = usuario;

      if (cedula) {
        const user = await User.findOne({ cedula }).select("_id");
        if (!user) {
          logger.warn(`⚠️ Cédula no encontrada: ${cedula}`);
          return res.status(404).json({ message: "Cédula no encontrada." });
        }

        usuarioId = user._id;
      }

      if (!mongoose.Types.ObjectId.isValid(usuarioId)) {
        logger.warn(`⚠️ ID de usuario inválido: ${usuarioId}`);
        return res.status(400).json({ message: "ID de usuario inválido." });
      }

      const paciente = await Paciente.findOne({ usuario: usuarioId }).select(
        "_id"
      );
      if (!paciente)
        return res
          .status(404)
          .json({ message: "Paciente no encontrado para este usuario." });

      filtro.paciente = paciente._id;
    }

    // Control por rol
    if (req.user.rol === "doctor") {
      const doctorObj = await Doctor.findOne({ usuario: req.user._id });
      if (!doctorObj)
        return res.status(403).json({ message: "Doctor no registrado." });
      filtro.doctor = doctorObj._id;
    }

    if (req.user.rol === "asistente") {
      const asistente = await User.findById(req.user._id);
      if (!asistente?.asociado_a) {
        return res
          .status(403)
          .json({ message: "No tienes un doctor asignado." });
      }

      const doctorObj = await Doctor.findOne({ usuario: asistente.asociado_a });
      if (!doctorObj)
        return res
          .status(404)
          .json({ message: "Doctor asociado no encontrado." });

      filtro.doctor = doctorObj._id;
    }

    if (req.user.rol === "paciente") {
      const paciente = await Paciente.findOne({ usuario: req.user._id });
      if (!paciente)
        return res
          .status(403)
          .json({ message: "No eres un paciente registrado." });
      filtro.paciente = paciente._id;
    }

    // Admin puede filtrar por doctor explícito
    if (req.user.rol === "admin" && doctor) {
      if (!mongoose.Types.ObjectId.isValid(doctor)) {
        return res.status(400).json({ message: "ID de doctor inválido." });
      }
      filtro.doctor = doctor;
    }

    const citas = await Cita.find(filtro)
      .populate({
        path: "paciente",
        populate: { path: "usuario", select: "-password" },
      })
      .populate({
        path: "doctor",
        populate: { path: "usuario", select: "-password" },
      })
      .populate("especialidad");

    res.json(citas);
  } catch (error) {
    logger.error("❌ Error al listar citas: " + error.message);
    res.status(500).json({ message: "Error al obtener citas." });
  }
};

/**
 * Consulta la disponibilidad de un doctor en una fecha dada.
 */
const obtenerDisponibilidadDoctor = async (req, res) => {
  try {
    const { doctorId, fecha, duracionMin = 30 } = req.query;

    if (!doctorId || !fecha) {
      return res.status(400).json({
        message: "Faltan parámetros obligatorios: doctorId y fecha",
      });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor || !doctor.horario_inicio || !doctor.horario_fin) {
      return res.status(404).json({
        message: "Doctor no encontrado o sin horario configurado",
      });
    }

    const duracion = parseInt(duracionMin);

    const posibles = generarIntervalos(
      doctor.horario_inicio,
      doctor.horario_fin,
      duracion
    );

    // 🔹 Citas del día
    const citasEseDia = await Cita.find({
      doctor: doctorId,
      fecha: new Date(fecha),
    });

    // 🔹 Bloqueos del día
    const bloqueos = await BloqueoHorario.find({
      doctor: doctorId,
      fecha: new Date(fecha),
    });

    // 🔹 Marcar horarios ocupados por citas
    const ocupadosCitas = citasEseDia.map((c) => c.horaInicio);

    // 🔹 Marcar horarios ocupados por bloqueos (con validación de campos)
    const ocupadosBloqueos = bloqueos.flatMap((b) => {
      if (!b.horaInicio || !b.horaFin) return [];
      return generarIntervalos(b.horaInicio, b.horaFin, duracion);
    });

    const ocupados = [...new Set([...ocupadosCitas, ...ocupadosBloqueos])];

    // 🔹 Calcular disponibles
    const libres = posibles.filter((h) => !ocupados.includes(h));

    res.json({
      fecha,
      doctor: doctorId,
      duracionMin: duracion,
      total: posibles.length,
      libres,
      ocupados,
    });
  } catch (error) {
    logger.error(`❌ Error al consultar disponibilidad: ${error.message}`);
    res.status(500).json({ message: "Error al consultar disponibilidad." });
  }
};

const sugerirHorariosDisponibles = async (req, res) => {
  try {
    const { doctorId, fecha, duracionMin = 30, cantidad = 3 } = req.query;

    if (!doctorId || !fecha) {
      return res.status(400).json({
        message: "Faltan parámetros obligatorios: doctorId y fecha",
      });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor || !doctor.horario_inicio || !doctor.horario_fin) {
      return res.status(404).json({
        message: "Doctor no encontrado o sin horario configurado",
      });
    }

    const posibles = generarIntervalos(
      doctor.horario_inicio,
      doctor.horario_fin,
      parseInt(duracionMin)
    );

    const citasEseDia = await Cita.find({
      doctor: doctorId,
      fecha: new Date(fecha),
    });

    const ocupados = citasEseDia.map((c) => c.horaInicio);
    const libres = posibles.filter((hora) => !ocupados.includes(hora));

    const sugerencias = libres.slice(0, parseInt(cantidad));

    res.json({
      fecha,
      doctor: doctorId,
      sugerencias,
      totalDisponibles: libres.length,
    });
  } catch (error) {
    logger.error(`❌ Error al sugerir horarios: ${error.message}`);
    res.status(500).json({ message: "Error al sugerir horarios." });
  }
};

module.exports = {
  crearCita,
  editarCita,
  eliminarCita,
  listarCitas,
  obtenerDisponibilidadDoctor,
  sugerirHorariosDisponibles,
};
