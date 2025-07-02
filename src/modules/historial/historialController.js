const fs = require("fs");
const mongoose = require("mongoose");
const HistorialClinico = require("./HistorialClinico");
const Paciente = require("../paciente/Paciente");
const Doctor = require("../doctor/Doctor");
const {
  subirImagen,
  eliminarImagen,
} = require("../../helpers/cloudinaryHelper");
const { enviarEmail } = require("../../helpers/emailHelper");
const { enviarWhatsapp } = require("../../helpers/whatsappHelper");
const logger = require("../../config/logger");
const User = require("../user/User");

const crearHistorial = async (req, res) => {
  try {
    const archivosSubidos = [];

    if (req.files && req.files.length > 0) {
      for (const archivo of req.files) {
        const subida = await subirImagen(archivo.path, "medarkia/historiales");
        archivosSubidos.push({
          url: subida.url,
          public_id: subida.public_id,
          tipo: archivo.mimetype,
          nombreOriginal: archivo.originalname,
        });
      }
    }

    const nuevoHistorial = new HistorialClinico({
      ...req.body,
      creado_por: req.user._id,
      archivos: archivosSubidos,
    });

    await nuevoHistorial.save();

    const paciente = await Paciente.findById(nuevoHistorial.paciente).populate(
      "usuario"
    );
    const doctor = await Doctor.findById(nuevoHistorial.doctor).populate(
      "usuario"
    );
    const fechaStr = new Date(nuevoHistorial.fecha).toLocaleDateString();

    const nombrePaciente = paciente?.usuario
      ? `${paciente.usuario.nombre} ${paciente.usuario.apellido}`
      : "-";
    const nombreDoctor = doctor?.usuario
      ? `${doctor.usuario.nombre} ${doctor.usuario.apellido}`
      : "-";
    const telefonoDoctor = doctor?.usuario?.telefono || "-";

    const mensaje = `Sr. (a): ${nombrePaciente}\n\n
      📋 Se ha creado un nuevo historial clínico el ${fechaStr}.
          Por Instrucciones del Doctor: Dr. (a) ${nombreDoctor}

      📌 Motivo: ${nuevoHistorial.motivoConsulta || "-"}
      📋 Diagnóstico: ${nuevoHistorial.diagnostico || "-"}\n\n\n
      📞 Contacto del doctor: (a) ${telefonoDoctor}`;

    await enviarEmail(
      paciente?.usuario?.email,
      "Nuevo historial clínico",
      mensaje
    );
    await enviarWhatsapp(paciente?.usuario?.telefono, mensaje);
    await enviarEmail(
      doctor?.usuario?.email,
      "Historial creado para paciente",
      mensaje
    );
    await enviarWhatsapp(doctor?.usuario?.telefono, mensaje);

    logger.info(
      `✅ Historial creado para paciente ${nombrePaciente} por el doctor ${nombreDoctor}`
    );

    res.status(201).json({
      message: "Historial clínico creado correctamente.",
      historial: nuevoHistorial,
    });
  } catch (error) {
    logger.error(`❌ Error al crear historial: ${error.message}`);
    res.status(500).json({ message: "Error al crear historial." });
  }
};

const listarHistoriales = async (req, res) => {
  try {
    const {
      paciente,
      doctor,
      cedula,
      nombre,
      apellido,
      fechaInicio,
      fechaFin,
      texto,
      page = 1,
      limit = 10,
    } = req.query;

    const filtro = {};

    // 🔐 Control por rol
    if (req.user.rol === "paciente") {
      const miPaciente = await Paciente.findOne({ usuario: req.user._id });
      if (!miPaciente) {
        logger.warn("⚠️ Paciente no encontrado.");
        return res.status(404).json({ message: "Paciente no encontrado." });
      }
      filtro.paciente = miPaciente._id;
    } else if (req.user.rol === "doctor") {
      const doctorObj = await Doctor.findOne({ usuario: req.user._id });
      if (!doctorObj) {
        logger.warn("⚠️ Doctor no registrado.");
        return res.status(403).json({ message: "Doctor no registrado." });
      }
      filtro.doctor = doctorObj._id;
    } else if (req.user.rol === "asistente") {
      const asistente = await User.findById(req.user._id);
      if (!asistente?.asociado_a) {
        return res
          .status(403)
          .json({ message: "No tienes un doctor asignado." });
      }
      const doctorObj = await Doctor.findOne({ usuario: asistente.asociado_a });
      if (!doctorObj) {
        return res
          .status(404)
          .json({ message: "Doctor asociado no encontrado." });
      }
      filtro.doctor = doctorObj._id;
    } else if (req.user.rol === "admin") {
      if (doctor) {
        if (!mongoose.Types.ObjectId.isValid(doctor)) {
          return res.status(400).json({ message: "ID de doctor inválido." });
        }
        filtro.doctor = doctor;
      }
    }

    // 🎯 Filtro por paciente ID
    if (paciente) {
      if (!mongoose.Types.ObjectId.isValid(paciente)) {
        return res.status(400).json({ message: "ID de paciente inválido." });
      }
      filtro.paciente = paciente;
    }

    // 🔍 Filtro por cédula, nombre o apellido del paciente
    if (cedula || nombre || apellido) {
      const usuarioQuery = {};
      if (cedula) usuarioQuery.cedula = cedula;
      if (nombre) usuarioQuery.nombre = { $regex: nombre, $options: "i" };
      if (apellido) usuarioQuery.apellido = { $regex: apellido, $options: "i" };

      const usuarios = await User.find(usuarioQuery).select("_id");
      if (!usuarios.length) {
        return res
          .status(404)
          .json({
            message:
              "No se encontraron pacientes que coincidan con los filtros.",
          });
      }

      const pacientes = await Paciente.find({
        usuario: { $in: usuarios.map((u) => u._id) },
      }).select("_id");
      if (!pacientes.length) {
        return res
          .status(404)
          .json({ message: "No se encontraron pacientes válidos." });
      }

      filtro.paciente = { $in: pacientes.map((p) => p._id) };
    }

    // 🗓️ Filtro por fechas
    if (fechaInicio || fechaFin) {
      filtro.fecha = {};
      if (fechaInicio) {
        const inicio = new Date(fechaInicio);
        if (isNaN(inicio))
          return res
            .status(400)
            .json({ message: "Formato de fechaInicio inválido." });
        filtro.fecha.$gte = inicio;
      }
      if (fechaFin) {
        const fin = new Date(fechaFin);
        if (isNaN(fin))
          return res
            .status(400)
            .json({ message: "Formato de fechaFin inválido." });
        filtro.fecha.$lte = fin;
      }
    }

    // 🔎 Filtro por texto libre
    if (texto) {
      filtro.$or = [
        { motivoConsulta: { $regex: texto, $options: "i" } },
        { diagnostico: { $regex: texto, $options: "i" } },
      ];
    }

    const historiales = await HistorialClinico.find(filtro)
      .populate({
        path: "paciente",
        populate: { path: "usuario", select: "-password" },
      })
      .populate({
        path: "doctor",
        populate: { path: "usuario", select: "-password" },
      })
      .populate("especialidad")
      .sort({ fecha: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json(historiales);
  } catch (error) {
    logger.error(`❌ Error al listar historiales: ${error.message}`);
    res.status(500).json({ message: "Error al obtener historiales." });
  }
};

const editarHistorial = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.warn("⚠️ ID de historial inválido.");
      return res.status(400).json({ message: "ID de historial inválido." });
    }

    const historial = await HistorialClinico.findById(id);
    if (!historial) {
      logger.warn("⚠️ Historial no encontrado.");
      return res.status(404).json({ message: "Historial no encontrado." });
    }

    if (req.user.rol === "doctor") {
      const doctor = await Doctor.findOne({ usuario: req.user._id });
      if (!doctor || doctor._id.toString() !== historial.doctor.toString()) {
        logger.warn("⚠️ Doctor sin permiso para editar este historial.");
        return res
          .status(403)
          .json({ message: "No tienes permiso para editar este historial." });
      }
    }

    const ahora = new Date();
    const diferenciaHoras = (ahora - historial.createdAt) / (1000 * 60 * 60);
    if (diferenciaHoras > 48) {
      logger.warn("⚠️ Edición no permitida: historial mayor a 48h.");
      return res.status(403).json({
        message: "El historial no puede editarse después de 48 horas.",
      });
    }

    historial.cambios = historial.cambios || [];
    historial.cambios.push({
      fecha: new Date(),
      motivoConsulta: historial.motivoConsulta,
      diagnostico: historial.diagnostico,
      tratamiento: historial.tratamiento,
      observaciones: historial.observaciones,
      editado_por: req.user._id,
    });

    if (req.files && req.files.length > 0 && historial.archivos?.length) {
      for (const archivo of historial.archivos) {
        await eliminarImagen(archivo.public_id);
      }
    }

    const archivosSubidos = [];
    if (req.files && req.files.length > 0) {
      for (const archivo of req.files) {
        const subida = await subirImagen(archivo.path, "medarkia/historiales");
        archivosSubidos.push({
          url: subida.url,
          public_id: subida.public_id,
          tipo: archivo.mimetype,
          nombreOriginal: archivo.originalname,
        });
      }
      historial.archivos = archivosSubidos;
    }

    Object.assign(historial, req.body);
    historial.editado_por = req.user._id;
    await historial.save();

    const paciente = await Paciente.findById(historial.paciente).populate(
      "usuario"
    );
    const doctor = await Doctor.findById(historial.doctor).populate("usuario");
    const fechaStr = new Date(historial.fecha).toLocaleDateString();

    const nombrePaciente = paciente?.usuario
      ? `${paciente.usuario.nombre} ${paciente.usuario.apellido}`
      : "-";
    const nombreDoctor = doctor?.usuario
      ? `${doctor.usuario.nombre} ${doctor.usuario.apellido}`
      : "-";
    const telefonoDoctor = doctor?.usuario?.telefono || "-";

    const mensaje = `Sr. (a): ${nombrePaciente}  \n\n
    📋 Se ha actualizado un historial clínico el ${fechaStr}.
           Por Instrucciones del Doctor: Dr. (a) ${nombreDoctor}

    📌 Motivo: ${historial.motivoConsulta || "-"}
    📋 Diagnóstico: ${historial.diagnostico || "-"}\n\n\n
    📞 Contacto del doctor: (a) ${telefonoDoctor}`;

    await enviarEmail(
      paciente?.usuario?.email,
      "Historial clínico actualizado",
      mensaje
    );
    await enviarWhatsapp(paciente?.usuario?.telefono, mensaje);
    await enviarEmail(
      doctor?.usuario?.email,
      "Historial clínico de tu paciente actualizado",
      mensaje
    );
    await enviarWhatsapp(doctor?.usuario?.telefono, mensaje);

    logger.info(
      `✏️ Historial actualizado por ${nombreDoctor} para paciente ${nombrePaciente}`
    );

    res.json({ message: "Historial actualizado correctamente." });
  } catch (error) {
    logger.error(`❌ Error al editar historial: ${error.message}`);
    res.status(500).json({ message: "Error al editar historial." });
  }
};

const eliminarHistorial = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.warn("⚠️ ID de historial inválido.");
      return res.status(400).json({ message: "ID de historial inválido." });
    }

    const historial = await HistorialClinico.findById(id);
    if (!historial) {
      logger.warn("⚠️ Historial no encontrado.");
      return res.status(404).json({ message: "Historial no encontrado." });
    }

    if (historial.archivos?.length) {
      for (const archivo of historial.archivos) {
        await eliminarImagen(archivo.public_id);
      }
    }

    await historial.deleteOne();
    logger.info(`🗑️ Historial eliminado con ID ${id}`);
    res.json({ message: "Historial eliminado correctamente." });
  } catch (error) {
    logger.error(`❌ Error al eliminar historial: ${error.message}`);
    res.status(500).json({ message: "Error al eliminar historial." });
  }
};

module.exports = {
  crearHistorial,
  listarHistoriales,
  editarHistorial,
  eliminarHistorial,
};
