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
const PDFDocument = require("pdfkit");

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
    const fechaStr = new Date(nuevoHistorial.fecha).toLocaleDateString(
      "es-VE",
      {
        timeZone: "UTC",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );

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
        return res.status(404).json({
          message: "No se encontraron pacientes que coincidan con los filtros.",
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
    const fechaStr = new Date(historial.fecha).toLocaleDateString("es-VE", {
      timeZone: "UTC",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

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

const exportarHistorialPDF = async (req, res) => {
  try {
    const { pacienteId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(pacienteId)) {
      return res.status(400).json({ message: "ID de paciente inválido." });
    }

    const paciente = await Paciente.findById(pacienteId).populate("usuario");
    if (!paciente) {
      return res.status(404).json({ message: "Paciente no encontrado." });
    }

    const esAdmin = req.user.rol === "admin";
    const esPaciente =
      req.user.rol === "paciente" &&
      paciente.usuario.toString() === req.user._id.toString();

    const historiales = await HistorialClinico.find({ paciente: pacienteId })
      .populate({
        path: "doctor",
        populate: { path: "usuario", model: "User" },
      })
        .populate("cambios.editado_por", "nombre apellido")
      .populate("especialidad")
      .populate("archivos")
      .sort({ fecha: -1 });

    const esDoctor =
      req.user.rol === "doctor" &&
      historiales.some(
        (h) => h.doctor?.usuario?._id?.toString() === req.user._id.toString()
      );

    if (!esAdmin && !esPaciente && !esDoctor) {
      return res
        .status(403)
        .json({ message: "No tienes permiso para exportar este historial." });
    }

    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="historial_${pacienteId}.pdf"`
    );
    doc.pipe(res);

    // Título principal
    doc.font("Helvetica").fontSize(16).text("Historial Clínico - Medarkia", {
      align: "center",
    });

    // Datos paciente y doctor
    const nombrePaciente = paciente.usuario
      ? `${paciente.usuario.nombre} ${paciente.usuario.apellido}`
      : "Paciente";

    const doctorPrincipal = historiales[0]?.doctor?.usuario;
    const nombreDoctor = doctorPrincipal
      ? `${doctorPrincipal.nombre} ${doctorPrincipal.apellido}`
      : "Doctor";

    doc
      .moveDown(0.5)
      .fontSize(12)
      .text(`Paciente: ${nombrePaciente}`, { align: "center" })
      .text(`Doctor: ${nombreDoctor}`, { align: "center" })
      .moveDown(1);

    // Fichas de historial
    // Fichas de historial
    for (const historial of historiales) {
      const fechaObj = new Date(historial.fecha);
      const fecha = fechaObj.toLocaleDateString("es-VE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      const hora = fechaObj.toLocaleTimeString("es-VE", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      doc
        .font("Helvetica")
        .fontSize(12)
        .text(`Fecha: ${fecha}`, { align: "right" })
        .text(`Hora: ${hora}`, { align: "right" }) // ← Aquí se reemplazó la línea
        .moveDown(0.5);

      doc
        .text(`Motivo: ${historial.motivoConsulta || "-"}`)
        .text(`Diagnóstico: ${historial.diagnostico || "-"}`)
        .text(`Tratamiento: ${historial.tratamiento || "-"}`)
        .text(`Observaciones: ${historial.observaciones || "-"}`)
        .moveDown();

        // Si el usuario pidió el modo detallado (?detallado=true)
if (req.query.detallado === "true") {
  // Archivos adjuntos
  if (historial.archivos?.length > 0) {
    doc.font("Helvetica-Bold").text("Historial de cambios:", { underline: true });

    historial.archivos.forEach((archivo, index) => {
      doc.text(`  ${index + 1}. ${archivo.nombreOriginal} (${archivo.tipo})`);
    });
    doc.moveDown(0.5);
  }

      // Cambios históricos
    if (historial.cambios?.length > 0) {
      doc.font("Helvetica-Bold").text("Historial de cambios:", { underline: true });

      historial.cambios.forEach((cambio, idx) => {
        const fechaCambio = new Date(cambio.fecha).toLocaleString("es-VE", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });

        let nombreEditor = "Usuario";
        if (typeof cambio.editado_por === "object" && cambio.editado_por !== null) {
          if (cambio.editado_por.nombre && cambio.editado_por.apellido) {
            nombreEditor = `${cambio.editado_por.nombre} ${cambio.editado_por.apellido}`;
          } else if (cambio.editado_por.nombre) {
            nombreEditor = cambio.editado_por.nombre;
          }
        }

        doc
          .font("Helvetica-Oblique")
          .fontSize(10)
          .text(
            `${idx + 1}. Editado por ${nombreEditor} el ${fechaCambio}:`
          )
          .text(`   • Motivo: ${cambio.motivoConsulta || "-"}`)
          .text(`   • Diagnóstico: ${cambio.diagnostico || "-"}`)
          .text(`   • Tratamiento: ${cambio.tratamiento || "-"}`)
          .text(`   • Observaciones: ${cambio.observaciones || "-"}`)
          .moveDown(0.3);
      });

      doc.moveDown(0.5);
    }

}


      doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor("gray").stroke();
      doc.moveDown();
    }
    // Firma y sello al final del documento
    doc.moveDown(2);

    // Línea izquierda para sello
    doc.text("Sello", 100, doc.y + 2);

    // Línea derecha para firma
    doc
      .moveTo(370, doc.y - 2)
      .lineTo(500, doc.y - 2)
      .strokeColor("black")
      .stroke();

    doc
      .fontSize(10)
      .text(`Firma: Dr. ${nombreDoctor}`, 370, doc.y + 2)
      .text(`Tel: ${doctorPrincipal?.telefono || "-"}`, 370, doc.y + 14);

    doc.moveDown(2);

    doc.end();
  } catch (error) {
    logger.error(`❌ Error al exportar historial PDF: ${error.message}`);
    res.status(500).json({ message: "Error al exportar historial." });
  }
};

module.exports = {
  crearHistorial,
  listarHistoriales,
  editarHistorial,
  eliminarHistorial,
  exportarHistorialPDF,
};
