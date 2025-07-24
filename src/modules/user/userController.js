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

    // 🔤 Capitalizar nombre y apellido
    const capitalizar = (texto) =>
      texto
        .trim()
        .toLowerCase()
        .replace(/\b\w/g, (l) => l.toUpperCase());

    const nombreCapitalizado = capitalizar(nombre);
    const apellidoCapitalizado = capitalizar(apellido);
    const cedulaLimpia = cedula.replace(/\D/g, "");

    const nuevoUsuario = new User({
      nombre: nombreCapitalizado,
      apellido: apellidoCapitalizado,
      cedula: cedulaLimpia,
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
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100); // máximo 100
    const { rol, cedula, texto } = req.query;

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
      .populate({
        path: "asociado_a",
        select: "nombre apellido", // 👈 Solo trae nombre y apellido del doctor
      })
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
    const total = await User.countDocuments(filtro);

    res.json({
      usuarios: usuariosConId,
      total,
    });
    // ✅ Enviar los usuarios con `id`
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

    const { nombre, apellido, email, password, telefono, rol, password_nueva } =
      req.body;

    // 🔤 Capitalizar si se envían
    const capitalizar = (texto = "") =>
      texto
        .toLowerCase()
        .trim()
        .split(" ")
        .filter(Boolean)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ");

    if (nombre) usuario.nombre = capitalizar(nombre);
    if (apellido) usuario.apellido = capitalizar(apellido);
    if (email) usuario.email = email;
    if (telefono) usuario.telefono = telefono;

    // ✅ Solo admin puede cambiar el rol
    if (rol && esAdmin) {
      usuario.rol = rol;
    }

    if (password_nueva) {
      usuario.password = password_nueva.trim();
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
        message:
          "Este usuario está protegido. Solo él puede cambiar su avatar.",
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
      return res.status(403).json({
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
    const { id } = req.params; // ID del asistente
    const { doctorId } = req.body; // ID del doctor a asignar

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

    // ✅ Validación adicional: Si el usuario autenticado es doctor, solo puede asignarse a sí mismo
    const esDoctor = req.user.rol === "doctor";
    if (esDoctor && doctor._id.toString() !== req.user._id.toString()) {
      logger.warn("⛔ Doctor intentando asignar a otro doctor.");
      return res
        .status(403)
        .json({ message: "Solo puedes asignarte a ti mismo como doctor." });
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


const cambiarPassword = async (req, res) => {
  try {
    const usuarioId = req.user._id;
    const { password_actual, password_nueva } = req.body;

    if (!password_actual || !password_nueva) {
      return res
        .status(400)
        .json({ message: "Se requieren ambas contraseñas." });
    }

    const usuario = await User.findById(usuarioId);
    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    const passwordCorrecta = await bcrypt.compare(
      password_actual,
      usuario.password
    );
    if (!passwordCorrecta) {
      return res.status(401).json({ message: "Contraseña actual incorrecta." });
    }

    // ✅ Activar pre("save")
    usuario.password = password_nueva;
    await usuario.save();

    res.json({ message: "Contraseña actualizada correctamente." });
  } catch (error) {
    res.status(500).json({ message: "Error al cambiar contraseña." });
  }
};

module.exports = {
  crearUsuario,
  listarUsuarios,
  actualizarUsuario,
  eliminarUsuario,
  actualizarAvatar,
  asignarDoctor,
  cambiarPassword,
};
