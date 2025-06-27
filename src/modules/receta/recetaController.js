const fs = require("fs");
const mongoose = require("mongoose");
const RecetaMedica = require("./RecetaMedica");
const Paciente = require("../paciente/Paciente");
const Doctor = require("../doctor/Doctor");
const User = require("../user/User");

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
    }\n\n🧾 Se ha creado una nueva receta médica el ${fechaStr}.\nPor Instrucciones del Doctor: Dr. (a) ${
      doctor.usuario.nombre
    } ${doctor.usuario.apellido}\n\n📌 Diagnóstico: ${
      nuevaReceta.diagnostico || "-"
    }\n💊 Medicamentos:\n${listaMedicamentos}\n📋 Indicaciones: ${
      nuevaReceta.indicaciones || "-"
    }\n\n📞 Contacto del doctor: ${doctor.usuario.telefono || "-"}`;

    await enviarEmail(paciente.usuario.email, "Nueva receta médica", mensaje);
    await enviarWhatsapp(paciente.usuario.telefono, mensaje);
    await enviarEmail(
      doctor.usuario.email,
      "Receta emitida a paciente",
      mensaje
    );
    await enviarWhatsapp(doctor.usuario.telefono, mensaje);

    res.status(201).json({
      message: "Receta médica creada correctamente",
      receta: nuevaReceta,
    });
  } catch (error) {
    console.error("❌ Error al crear receta:", error);
    res.status(500).json({ message: "Error al crear receta médica." });
  }
};

const editarReceta = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID de receta inválido." });
    }

    const receta = await RecetaMedica.findById(id);
    if (!receta) {
      return res.status(404).json({ message: "Receta no encontrada." });
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
    }\n\n✏️ Se ha actualizado una receta médica el ${fechaStr}.\nPor Instrucciones del Doctor: Dr. (a) ${
      doctor.usuario.nombre
    } ${doctor.usuario.apellido}\n\n📌 Diagnóstico: ${
      receta.diagnostico || "-"
    }\n💊 Medicamentos:\n${listaMedicamentos}\n📋 Indicaciones: ${
      receta.indicaciones || "-"
    }\n\n📞 Contacto del doctor: ${doctor.usuario.telefono || "-"}`;

    await enviarEmail(
      paciente.usuario.email,
      "Receta médica actualizada",
      mensaje
    );
    await enviarWhatsapp(paciente.usuario.telefono, mensaje);
    await enviarEmail(doctor.usuario.email, "Receta médica editada", mensaje);
    await enviarWhatsapp(doctor.usuario.telefono, mensaje);

    res.json({ message: "Receta médica actualizada correctamente" });
  } catch (error) {
    console.error("❌ Error al editar receta:", error);
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

    // 📌 Rol: doctor → solo ve recetas que él creó
    if (usuario.rol === "doctor") {
      filtro.creado_por = usuario._id;
    }

    // 📌 Rol: asistente → debe estar asociado a un doctor
    if (usuario.rol === "asistente") {
      const userAsistente = await User.findById(usuario._id);
      if (!userAsistente?.asociado_a) {
        return res.status(403).json({
          message: "Este asistente no está asociado a ningún doctor.",
        });
      }
      filtro.creado_por = userAsistente.asociado_a;
    }

    // 📌 Rol: paciente → solo ve sus propias recetas
    if (usuario.rol === "paciente") {
      const pacienteDoc = await Paciente.findOne({ usuario: usuario._id });
      if (!pacienteDoc) {
        return res.status(403).json({ message: "Paciente no encontrado." });
      }
      filtro.paciente = pacienteDoc._id;
    }

    // 📌 Rol: admin → puede filtrar por doctor, paciente, cédula, fecha
    if (usuario.rol === "admin") {
      if (doctor) {
        if (!mongoose.Types.ObjectId.isValid(doctor)) {
          return res.status(400).json({ message: "ID de doctor inválido." });
        }
        filtro.doctor = doctor;
      }

      if (paciente) {
        if (!mongoose.Types.ObjectId.isValid(paciente)) {
          return res.status(400).json({ message: "ID de paciente inválido." });
        }
        filtro.paciente = paciente;
      }

      if (cedula) {
        const cedulaLimpia = cedula.replace(/^V|^E/, "").trim();
        const usuarioCedula = await User.findOne({ cedula: cedulaLimpia });

        if (!usuarioCedula) {
          return res
            .status(404)
            .json({ message: "Usuario con esa cédula no encontrado." });
        }

        const pacienteRelacionado = await Paciente.findOne({
          usuario: usuarioCedula._id,
        });

        if (!pacienteRelacionado) {
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
          return res.status(400).json({
            message: "Formato de fecha inválido. Usa YYYY-MM-DD.",
          });
        }

        const inicioDia = new Date(fechaObj);
        const finDia = new Date(fechaObj);
        finDia.setUTCHours(23, 59, 59, 999);

        filtro.fecha = {
          $gte: inicioDia,
          $lte: finDia,
        };
      }
    }

    // 📅 Filtro adicional por rango de fechas
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
    console.error("❌ Error al listar recetas:", error);
    res.status(500).json({ message: "Error al obtener recetas." });
  }
};

const eliminarReceta = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID de receta inválido." });
    }

    const receta = await RecetaMedica.findById(id);
    if (!receta) {
      return res.status(404).json({ message: "Receta no encontrada." });
    }

    if (receta.archivos?.length) {
      for (const archivo of receta.archivos) {
        await eliminarImagen(archivo.public_id);
      }
    }

    await receta.deleteOne();
    res.json({ message: "Receta médica eliminada correctamente" });
  } catch (error) {
    console.error("❌ Error al eliminar receta:", error);
    res.status(500).json({ message: "Error al eliminar receta médica." });
  }
};

module.exports = {
  crearReceta,
  editarReceta,
  listarRecetas,
  eliminarReceta,
};
