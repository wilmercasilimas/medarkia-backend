const fs = require("fs");
const mongoose = require("mongoose");
const RecetaMedica = require("./RecetaMedica");
const Paciente = require("../paciente/Paciente");
const Doctor = require("../doctor/Doctor");
const User = require("../user/User");
const logger = require("../../config/logger");
const PDFDocument = require("pdfkit");

const {
  subirImagen,
  eliminarImagen,
} = require("../../helpers/cloudinaryHelper");
const { enviarEmail } = require("../../helpers/emailHelper");
const { enviarWhatsapp } = require("../../helpers/whatsappHelper");

const crearReceta = async (req, res) => {
  try {
    const archivosSubidos = [];

    if (req.files && req.files.length > 0) {
      for (const archivo of req.files) {
        const subida = await subirImagen(archivo.path, "medarkia/recetas");
        archivosSubidos.push({
          url: subida.url,
          public_id: subida.public_id,
          tipo: archivo.mimetype,
          nombreOriginal: archivo.originalname,
        });
      }
    }

    const nuevaReceta = new RecetaMedica({
      ...req.body,
      creado_por: req.user._id,
      archivos: archivosSubidos,
    });

    await nuevaReceta.save();

    const paciente = await Paciente.findById(nuevaReceta.paciente).populate(
      "usuario"
    );
    const doctor = await Doctor.findById(nuevaReceta.doctor).populate(
      "usuario"
    );
    const fechaStr = new Date(nuevaReceta.fecha).toLocaleDateString();

    const listaMedicamentos =
      nuevaReceta.medicamentos
        .filter((m) => m.nombre && m.nombre.trim())
        .map((m) => {
          const partes = [
            m.nombre,
            m.dosis && `Dosis: ${m.dosis}`,
            m.frecuencia && `Frecuencia: ${m.frecuencia}`,
            m.duracion && `Duración: ${m.duracion}`,
            m.indicaciones && `Indicaciones: ${m.indicaciones}`,
          ]
            .filter(Boolean)
            .join(" | ");
          return `- ${partes}`;
        })
        .join("\n") || "-";

    const mensaje = `Sr. (a): ${paciente.usuario.nombre} ${
      paciente.usuario.apellido
    }

🧾 Se ha creado una nueva receta médica el ${fechaStr}.
Por Instrucciones del Doctor: Dr. (a) ${doctor.usuario.nombre} ${
      doctor.usuario.apellido
    }

📌 Diagnóstico: ${nuevaReceta.diagnostico || "-"}
💊 Medicamentos:
${listaMedicamentos}
📋 Indicaciones: ${nuevaReceta.indicaciones || "-"}

📞 Contacto del doctor: ${doctor.usuario.telefono || "-"}`;

    await enviarEmail(paciente.usuario.email, "Nueva receta médica", mensaje);
    await enviarWhatsapp(paciente.usuario.telefono, mensaje);
    await enviarEmail(
      doctor.usuario.email,
      "Receta emitida a paciente",
      mensaje
    );
    await enviarWhatsapp(doctor.usuario.telefono, mensaje);

    logger.info(
      `🧾 Receta creada para paciente: ${paciente.usuario.nombre} ${paciente.usuario.apellido}`
    );

    res.status(201).json({
      message: "Receta médica creada correctamente",
      receta: nuevaReceta,
    });
  } catch (error) {
    logger.error(`❌ Error al crear receta: ${error.message}`);
    res.status(500).json({ message: "Error al crear receta médica." });
  }
};

const editarReceta = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.warn("⚠️ ID de receta inválido.");
      return res.status(400).json({ message: "ID de receta inválido." });
    }

    const receta = await RecetaMedica.findById(id);
    if (!receta) {
      logger.warn("⚠️ Receta no encontrada.");
      return res.status(404).json({ message: "Receta no encontrada." });
    }

    // ✅ Validar que el doctor sea quien creó la receta
    if (
      req.user.rol === "doctor" &&
      receta.creado_por.toString() !== req.user._id.toString()
    ) {
      logger.warn("⚠️ Acceso denegado: receta no creada por este doctor.");
      return res
        .status(403)
        .json({ message: "No tienes permiso para modificar esta receta." });
    }

    if (req.files && req.files.length > 0 && receta.archivos?.length) {
      for (const archivo of receta.archivos) {
        await eliminarImagen(archivo.public_id);
      }
    }

    const archivosSubidos = [];
    if (req.files && req.files.length > 0) {
      for (const archivo of req.files) {
        const subida = await subirImagen(archivo.path, "medarkia/recetas");
        archivosSubidos.push({
          url: subida.url,
          public_id: subida.public_id,
          tipo: archivo.mimetype,
          nombreOriginal: archivo.originalname,
        });
      }
      receta.archivos = archivosSubidos;
    }

    Object.assign(receta, req.body);
    receta.editado_por = req.user._id;
    await receta.save();

    const paciente = await Paciente.findById(receta.paciente).populate(
      "usuario"
    );
    const doctor = await Doctor.findById(receta.doctor).populate("usuario");
    const fechaStr = new Date(receta.fecha).toLocaleDateString();

    const listaMedicamentos =
      receta.medicamentos
        .filter((m) => m.nombre && m.nombre.trim())
        .map((m) => {
          const partes = [
            m.nombre,
            m.dosis && `Dosis: ${m.dosis}`,
            m.frecuencia && `Frecuencia: ${m.frecuencia}`,
            m.duracion && `Duración: ${m.duracion}`,
            m.indicaciones && `Indicaciones: ${m.indicaciones}`,
          ]
            .filter(Boolean)
            .join(" | ");
          return `- ${partes}`;
        })
        .join("\n") || "-";

    const mensaje = `Sr. (a): ${paciente.usuario.nombre} ${
      paciente.usuario.apellido
    }

✏️ Se ha actualizado una receta médica el ${fechaStr}.
Por Instrucciones del Doctor: Dr. (a) ${doctor.usuario.nombre} ${
      doctor.usuario.apellido
    }

📌 Diagnóstico: ${receta.diagnostico || "-"}
💊 Medicamentos:
${listaMedicamentos}
📋 Indicaciones: ${receta.indicaciones || "-"}

📞 Contacto del doctor: ${doctor.usuario.telefono || "-"}`;

    await enviarEmail(
      paciente.usuario.email,
      "Receta médica actualizada",
      mensaje
    );
    await enviarWhatsapp(paciente.usuario.telefono, mensaje);
    await enviarEmail(doctor.usuario.email, "Receta médica editada", mensaje);
    await enviarWhatsapp(doctor.usuario.telefono, mensaje);

    logger.info(`✏️ Receta editada: ${id}`);

    res.json({ message: "Receta médica actualizada correctamente" });
  } catch (error) {
    logger.error(`❌ Error al editar receta: ${error.message}`);
    res.status(500).json({ message: "Error al editar receta médica." });
  }
};

const listarRecetas = async (req, res) => {
  try {
    const {
      paciente,
      doctor,
      cedula,
      fecha,
      fechaInicio,
      fechaFin,
      page = 1,
      limit = 10,
    } = req.query;
    const filtro = {};
    const usuario = req.user;

    if (usuario.rol === "doctor") {
      filtro.creado_por = usuario._id;
    }

    if (usuario.rol === "asistente") {
      const userAsistente = await User.findById(usuario._id);
      if (!userAsistente?.asociado_a) {
        logger.warn("⚠️ Asistente sin doctor asociado.");
        return res.status(403).json({
          message: "Este asistente no está asociado a ningún doctor.",
        });
      }
      filtro.creado_por = userAsistente.asociado_a;
    }

    if (usuario.rol === "paciente") {
      const pacienteDoc = await Paciente.findOne({ usuario: usuario._id });
      if (!pacienteDoc) {
        logger.warn("⚠️ Paciente no encontrado.");
        return res.status(403).json({ message: "Paciente no encontrado." });
      }
      filtro.paciente = pacienteDoc._id;
    }

    if (usuario.rol === "admin") {
      if (doctor) {
        if (!mongoose.Types.ObjectId.isValid(doctor)) {
          logger.warn("⚠️ ID de doctor inválido.");
          return res.status(400).json({ message: "ID de doctor inválido." });
        }
        filtro.doctor = doctor;
      }

      if (paciente) {
        if (!mongoose.Types.ObjectId.isValid(paciente)) {
          logger.warn("⚠️ ID de paciente inválido.");
          return res.status(400).json({ message: "ID de paciente inválido." });
        }
        filtro.paciente = paciente;
      }

      if (cedula) {
        const cedulaLimpia = cedula.replace(/^V|^E/, "").trim();
        const usuarioCedula = await User.findOne({ cedula: cedulaLimpia });

        if (!usuarioCedula) {
          logger.warn("⚠️ Usuario con esa cédula no encontrado.");
          return res
            .status(404)
            .json({ message: "Usuario con esa cédula no encontrado." });
        }

        const pacienteRelacionado = await Paciente.findOne({
          usuario: usuarioCedula._id,
        });

        if (!pacienteRelacionado) {
          logger.warn("⚠️ Paciente con esa cédula no encontrado.");
          return res
            .status(404)
            .json({ message: "Paciente con esa cédula no encontrado." });
        }

        filtro.paciente = pacienteRelacionado._id;
      }

      if (fecha) {
        const [year, month, day] = fecha.split("-");
        const fechaObj = new Date(Date.UTC(+year, +month - 1, +day));

        if (isNaN(fechaObj)) {
          logger.warn("⚠️ Formato de fecha inválido.");
          return res
            .status(400)
            .json({ message: "Formato de fecha inválido. Usa YYYY-MM-DD." });
        }

        const inicioDia = new Date(fechaObj);
        const finDia = new Date(fechaObj);
        finDia.setUTCHours(23, 59, 59, 999);

        filtro.fecha = { $gte: inicioDia, $lte: finDia };
      }
    }

    if (fechaInicio || fechaFin) {
      filtro.fecha = filtro.fecha || {};
      if (fechaInicio) filtro.fecha.$gte = new Date(fechaInicio);
      if (fechaFin) filtro.fecha.$lte = new Date(fechaFin);
    }

    const recetas = await RecetaMedica.find(filtro)
      .populate({
        path: "paciente",
        populate: { path: "usuario", select: "-password" },
      })
      .populate({
        path: "doctor",
        populate: { path: "usuario", select: "-password" },
      })
      .populate("especialidad")
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json(recetas);
  } catch (error) {
    logger.error(`❌ Error al listar recetas: ${error.message}`);
    res.status(500).json({ message: "Error al obtener recetas." });
  }
};

const eliminarReceta = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.warn("⚠️ ID de receta inválido.");
      return res.status(400).json({ message: "ID de receta inválido." });
    }

    const receta = await RecetaMedica.findById(id);
    if (!receta) {
      logger.warn("⚠️ Receta no encontrada.");
      return res.status(404).json({ message: "Receta no encontrada." });
    }

    // ✅ Validar que el doctor sea quien creó la receta
    if (
      req.user.rol === "doctor" &&
      receta.creado_por.toString() !== req.user._id.toString()
    ) {
      logger.warn("⚠️ Acceso denegado: receta no creada por este doctor.");
      return res
        .status(403)
        .json({ message: "No tienes permiso para eliminar esta receta." });
    }

    if (receta.archivos?.length) {
      for (const archivo of receta.archivos) {
        await eliminarImagen(archivo.public_id);
      }
    }

    await receta.deleteOne();
    logger.info(`🗑️ Receta eliminada: ${id}`);

    res.json({ message: "Receta médica eliminada correctamente" });
  } catch (error) {
    logger.error(`❌ Error al eliminar receta: ${error.message}`);
    res.status(500).json({ message: "Error al eliminar receta médica." });
  }
};

const exportarRecetasPDF = async (req, res) => {
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

    const recetas = await RecetaMedica.find({ paciente: pacienteId })
      .populate({
        path: "doctor",
        populate: { path: "usuario", model: "User" },
      })
      .sort({ fecha: -1 });

    const esDoctor =
      req.user.rol === "doctor" &&
      recetas.some(
        (r) => r.doctor?.usuario?._id?.toString() === req.user._id.toString()
      );

    if (!esAdmin && !esPaciente && !esDoctor) {
      return res
        .status(403)
        .json({ message: "No tienes permiso para exportar estas recetas." });
    }

    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="recetas_${pacienteId}.pdf"`
    );
    doc.pipe(res);

    doc
      .font("Helvetica")
      .fontSize(16)
      .text("Recetas Médicas - Medarkia", { align: "center" });
    doc.moveDown();

    // Doctor principal para firmar al final
    const doctorPrincipal = recetas[0]?.doctor?.usuario;
    const nombreDoctor = doctorPrincipal
      ? `${doctorPrincipal.nombre} ${doctorPrincipal.apellido}`
      : "Doctor";

    for (const receta of recetas) {
      const fecha = new Date(receta.fecha).toLocaleDateString("es-VE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      const nombrePaciente = paciente.usuario
        ? `${paciente.usuario.nombre} ${paciente.usuario.apellido}`
        : "Paciente";

      const nombreDoctorReceta = receta.doctor?.usuario
        ? `${receta.doctor.usuario.nombre} ${receta.doctor.usuario.apellido}`
        : "Doctor";

      doc
        .font("Helvetica")
        .fontSize(12)
        .text(`Fecha: ${fecha}`)
        .text(`Paciente: ${nombrePaciente}`)
        .text(`Doctor: ${nombreDoctorReceta}`)
        .moveDown(0.5);

      doc.text(`Diagnóstico: ${receta.diagnostico || "-"}`);
      doc.text(`Indicaciones generales: ${receta.indicaciones || "-"}`);
      doc.moveDown(0.5);

      if (receta.medicamentos && receta.medicamentos.length > 0) {
        doc.text("Medicamentos:", { underline: true });
        receta.medicamentos.forEach((med, index) => {
          const partes = [];
          if (med.dosis) partes.push(med.dosis);
          if (med.frecuencia) partes.push(med.frecuencia);
          if (med.duracion) partes.push(med.duracion);
          if (med.indicaciones) partes.push(med.indicaciones);

          doc.text(
            `${index + 1}. ${med.nombre}${
              partes.length ? " - " + partes.join(", ") : ""
            }`
          );
        });
        doc.moveDown();
      }

      doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor("gray").stroke();
      doc.moveDown();
    }

    // 🔽 Firma y sello al final del documento
    doc.moveDown(2);
    doc.text("Sello", 100, doc.y + 2);

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
    logger.error(`❌ Error al exportar recetas PDF: ${error.message}`);
    res.status(500).json({ message: "Error al exportar recetas." });
  }
};


module.exports = {
  crearReceta,
  editarReceta,
  listarRecetas,
  eliminarReceta,
  exportarRecetasPDF,
};
