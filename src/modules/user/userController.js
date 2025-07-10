const User = require("./User");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const logger = require("../../config/logger");
const { procesarAvatar } = require("../../helpers/gestorAvatar");

// Crear nuevo usuario
const crearUsuario = async (req, res) => {
  try {
    const { nombre, apellido, cedula, email, password, telefono, rol } =
      req.body;

    if (!nombre || !apellido || !email || !password || !telefono || !cedula) {
      logger.warn("⚠️ Campos obligatorios faltantes al crear usuario.");
      return res.status(400).json({
        message: "Todos los campos obligatorios deben estar completos.",
      });
    }

    const existeUsuario = await User.findOne({ email });
    if (existeUsuario) {
      logger.warn("⚠️ Email ya registrado.");
      return res.status(409).json({ message: "El email ya está registrado." });
    }

    const avatar = await procesarAvatar(req.file, null);

    const nuevoUsuario = new User({
      nombre,
      apellido,
      cedula,
      email,
      password,
      telefono,
      rol,
      avatar,
      creado_por: req.user?._id || null,
    });

    await nuevoUsuario.save();

    logger.info(`✅ Usuario creado: ${email}`);

    res.status(201).json({
      message: "Usuario creado correctamente.",
      usuario: {
        id: nuevoUsuario._id,
        nombre: nuevoUsuario.nombre,
        apellido: nuevoUsuario.apellido,
        cedula: nuevoUsuario.cedula,
        email: nuevoUsuario.email,
        telefono: nuevoUsuario.telefono,
        rol: nuevoUsuario.rol,
        avatar: nuevoUsuario.avatar,
      },
    });
  } catch (error) {
    logger.error("❌ Error al crear usuario: " + error.message);
    res.status(500).json({ message: "Error al crear el usuario." });
  }
};

// Listar usuarios
// Listar usuarios
const listarUsuarios = async (req, res) => {
  try {
    const { rol, cedula, texto, page = 1, limit = 10 } = req.query;
    const filtro = {};

    if (rol) {
      if (!["admin", "doctor", "asistente", "paciente"].includes(rol)) {
        logger.warn("⚠️ Rol inválido al listar usuarios.");
        return res.status(400).json({ message: "Rol inválido." });
      }
      filtro.rol = rol;
    }

    if (cedula) filtro.cedula = cedula;

    if (texto) {
      filtro.$or = [
        { nombre: { $regex: texto, $options: "i" } },
        { apellido: { $regex: texto, $options: "i" } },
      ];
    }

    const usuarios = await User.find(filtro)
      .select("-password")
      .sort({ apellido: 1, nombre: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean(); // ✅ Convertir documentos a objetos JS simples

    const usuariosConId = usuarios.map((u) => ({
      ...u,
      id: u._id.toString(), // ✅ Agregar campo `id`
    }));

    logger.info("📋 Usuarios listados.");
    res.json(usuariosConId); // ✅ Enviar los usuarios con `id`
  } catch (error) {
    logger.error("❌ Error al listar usuarios: " + error.message);
    res.status(500).json({ message: "Error al obtener usuarios." });
  }
};

// Actualizar usuario completo
const actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.warn("⚠️ ID inválido para actualizar usuario.");
      return res.status(400).json({ message: "ID inválido." });
    }

    const usuario = await User.findById(id);
    if (!usuario) {
      logger.warn("⚠️ Usuario no encontrado para actualizar.");
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    // 🔒 Validar propiedad o rol admin
    const esAdmin = req.user.rol === "admin";
    const esPropietario = req.user._id.toString() === usuario._id.toString();

    if (!esAdmin && !esPropietario) {
      logger.warn("⛔ Acceso denegado para editar otro usuario.");
      return res.status(403).json({
        message: "No tienes permiso para modificar este usuario.",
      });
    }

    if (usuario.protegido && !esPropietario) {
      logger.warn("⚠️ Intento de editar usuario protegido.");
      return res.status(403).json({
        message:
          "Este usuario está protegido y no puede ser editado por otros.",
      });
    }

    const { nombre, apellido, email, password, telefono, rol } = req.body;
    
    if (nombre) usuario.nombre = nombre;
    if (apellido) usuario.apellido = apellido;
    if (email) usuario.email = email;
    if (telefono) usuario.telefono = telefono;

    console.log("🔍 Password recibido:", password);


    // ✅ Solo admin puede cambiar el rol
    if (rol && esAdmin) {
      usuario.rol = rol;
    }

    if (password) {
      usuario.password = await bcrypt.hash(password, 10);
    }

    if (req.file) {
      usuario.avatar = await procesarAvatar(req.file, usuario.avatar);
    }

    usuario.editado_por = req.user?._id || null;

    await usuario.save();

    logger.info(`✏️ Usuario actualizado: ${id}`);

    res.json({ message: "Usuario actualizado correctamente." });
  } catch (error) {
    logger.error("❌ Error al actualizar usuario: " + error.message);
    res.status(500).json({ message: "Error al actualizar el usuario." });
  }
};

// Actualizar solo avatar
const actualizarAvatar = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.warn("⚠️ ID inválido para actualizar avatar.");
      return res.status(400).json({ message: "ID inválido." });
    }

    const archivo = req.file;
    if (!archivo) {
      logger.warn("⚠️ No se subió archivo para actualizar avatar.");
      return res.status(400).json({ message: "No se subió ningún archivo." });
    }

    const usuario = await User.findById(id);
if (!usuario) {
  logger.warn("⚠️ Usuario no encontrado para actualizar avatar.");
  return res.status(404).json({ message: "Usuario no encontrado." });
}

// ✅ Primero calcular roles
const esPropietario = usuario._id.toString() === req.user._id.toString();
const esAdmin = req.user.rol === "admin";

// 🔐 Protección del super admin
if (usuario.protegido && !esPropietario) {
  logger.warn("⚠️ Intento de cambiar avatar de usuario protegido.");
  return res.status(403).json({
    message: "Este usuario está protegido. Solo él puede cambiar su avatar.",
  });
}

// 🔒 Validación general: solo dueño o admin
if (!esPropietario && !esAdmin) {
  logger.warn("⛔ Acceso denegado para cambiar avatar de otro usuario.");
  return res.status(403).json({
    message: "No tienes permiso para modificar el avatar de este usuario.",
  });
}


    usuario.avatar = await procesarAvatar(archivo, usuario.avatar);
    await usuario.save();

    logger.info(`🖼️ Avatar actualizado: ${id}`);

    res.json({
      message: "Avatar actualizado correctamente.",
      avatar: usuario.avatar,
    });
  } catch (error) {
    logger.error("❌ Error al actualizar avatar: " + error.message);
    res.status(500).json({ message: "Error al actualizar avatar." });
  }
};

// Eliminar usuario
const eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.warn("⚠️ ID inválido para eliminar usuario.");
      return res.status(400).json({ message: "ID inválido." });
    }

    const usuario = await User.findById(id);
    if (!usuario) {
      logger.warn("⚠️ Usuario no encontrado para eliminar.");
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    if (usuario.protegido) {
      logger.warn("⚠️ Intento de eliminar usuario protegido.");
      return res
        .status(403)
        .json({
          message: "Este usuario está protegido y no puede ser eliminado.",
        });
    }

    if (usuario.rol === "admin") {
      const admins = await User.find({ rol: "admin" });
      if (admins.length <= 2) {
        logger.warn("⚠️ No se puede eliminar el último admin.");
        return res.status(403).json({
          message:
            "Debe haber al menos 2 administradores activos. No se puede eliminar este usuario.",
        });
      }
    }

    const publicId = usuario.avatar?.public_id;
    if (publicId && !publicId.includes("default")) {
      const { eliminarImagen } = require("../../helpers/cloudinaryHelper");
      await eliminarImagen(publicId);
    }

    await usuario.deleteOne();

    logger.info(`🗑️ Usuario eliminado: ${id}`);

    res.json({ message: "Usuario eliminado correctamente." });
  } catch (error) {
    logger.error("❌ Error al eliminar usuario: " + error.message);
    res.status(500).json({ message: "Error al eliminar el usuario." });
  }
};

const asignarDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const { doctorId } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(doctorId)
    ) {
      logger.warn("⚠️ ID inválido para asignar doctor.");
      return res.status(400).json({ message: "ID inválido." });
    }

    const asistente = await User.findById(id);
    const doctor = await User.findById(doctorId);

    if (!asistente || asistente.rol !== "asistente") {
      logger.warn("⚠️ Asistente inválido para asignar doctor.");
      return res
        .status(404)
        .json({ message: "Asistente no encontrado o no es rol asistente." });
    }

    if (!doctor || doctor.rol !== "doctor") {
      logger.warn("⚠️ Doctor inválido para asignación.");
      return res
        .status(404)
        .json({ message: "Doctor no encontrado o no es rol doctor." });
    }

    asistente.asociado_a = doctorId;
    await asistente.save();

    logger.info(`🔗 Doctor asignado al asistente: ${id} → ${doctorId}`);

    res.json({
      message: "Doctor asignado al asistente correctamente.",
      asistente,
    });
  } catch (error) {
    logger.error("❌ Error al asignar doctor: " + error.message);
    res.status(500).json({ message: "Error al asignar doctor al asistente." });
  }
};

module.exports = {
  crearUsuario,
  listarUsuarios,
  actualizarUsuario,
  eliminarUsuario,
  actualizarAvatar,
  asignarDoctor,
};
