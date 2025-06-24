const User = require("./User");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const { procesarAvatar } = require("../../helpers/gestorAvatar");

// Crear nuevo usuario
const crearUsuario = async (req, res) => {
  try {
    const { nombre, apellido, cedula, email, password, telefono, rol } = req.body;

    if (!nombre || !apellido || !email || !password || !telefono || !cedula) {
      return res.status(400).json({
        message: "Todos los campos obligatorios deben estar completos.",
      });
    }

    const existeUsuario = await User.findOne({ email });
    if (existeUsuario) {
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
      telefono,
      rol,
      avatar,
      creado_por: req.user?._id || null,
    });

    await nuevoUsuario.save();

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
    console.error("❌ Error al crear usuario:", error);
    res.status(500).json({ message: "Error al crear el usuario." });
  }
};

// Listar usuarios
const listarUsuarios = async (req, res) => {
  try {
    const { nombre, apellido, cedula } = req.query;
    const filtro = {};

    if (nombre) filtro.nombre = new RegExp(nombre, "i");
    if (apellido) filtro.apellido = new RegExp(apellido, "i");
    if (cedula) filtro.cedula = cedula;

    const usuarios = await User.find(filtro).select("-password");
    res.json(usuarios);
  } catch (error) {
    console.error("❌ Error al listar usuarios:", error);
    res.status(500).json({ message: "Error al obtener usuarios." });
  }
};

// Actualizar usuario completo
const actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido." });
    }

    const usuario = await User.findById(id);
    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    const { nombre, apellido, email, password, telefono, rol } = req.body;

    if (nombre) usuario.nombre = nombre;
    if (apellido) usuario.apellido = apellido;
    if (email) usuario.email = email;
    if (telefono) usuario.telefono = telefono;
    if (rol) usuario.rol = rol;
    if (password) usuario.password = await bcrypt.hash(password, 10);

    if (req.file) {
      usuario.avatar = await procesarAvatar(req.file, usuario.avatar);
    }

    usuario.editado_por = req.user?._id || null;

    await usuario.save();

    res.json({ message: "Usuario actualizado correctamente." });
  } catch (error) {
    console.error("❌ Error al actualizar usuario:", error);
    res.status(500).json({ message: "Error al actualizar el usuario." });
  }
};

// Actualizar solo avatar
const actualizarAvatar = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido." });
    }

    const archivo = req.file;

    if (!archivo) {
      return res.status(400).json({ message: "No se subió ningún archivo." });
    }

    const usuario = await User.findById(id);
    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    usuario.avatar = await procesarAvatar(archivo, usuario.avatar);
    await usuario.save();

    res.json({
      message: "Avatar actualizado correctamente.",
      avatar: usuario.avatar,
    });
  } catch (error) {
    console.error("❌ Error al actualizar avatar:", error);
    res.status(500).json({ message: "Error al actualizar avatar." });
  }
};

// Eliminar usuario
const eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido." });
    }

    const usuario = await User.findById(id);
    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    if (usuario.email === "wilmercasilimas@gmail.com") {
      return res.status(403).json({ message: "Este usuario no puede ser eliminado." });
    }

    if (usuario.rol === "admin") {
      const admins = await User.find({ rol: "admin" });
      if (admins.length <= 2) {
        return res.status(403).json({
          message: "Debe haber al menos 2 administradores activos. No se puede eliminar este usuario.",
        });
      }
    }

    const publicId = usuario.avatar?.public_id;
    if (publicId && !publicId.includes("default")) {
      const { eliminarImagen } = require("../../helpers/cloudinaryHelper");
      await eliminarImagen(publicId);
    }

    await usuario.deleteOne();

    res.json({ message: "Usuario eliminado correctamente." });
  } catch (error) {
    console.error("❌ Error al eliminar usuario:", error);
    res.status(500).json({ message: "Error al eliminar el usuario." });
  }
};

module.exports = {
  crearUsuario,
  listarUsuarios,
  actualizarUsuario,
  eliminarUsuario,
  actualizarAvatar,
};
