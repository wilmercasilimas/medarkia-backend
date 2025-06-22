const User = require("../user/User");
const jwt = require("jsonwebtoken");

// Registrar nuevo usuario
const registrar = async (req, res) => {
  try {
    const { nombre, apellido, email, password, rol } = req.body;

    // Validar campos
    if (!nombre || !apellido || !email || !password) {
      return res.status(400).json({ message: "Todos los campos son obligatorios." });
    }

    // Verificar si ya existe
    const existeUsuario = await User.findOne({ email });
    if (existeUsuario) {
      return res.status(400).json({ message: "Este correo ya está registrado." });
    }

    // Crear usuario
    const nuevoUsuario = new User({ nombre, apellido, email, password, rol });
    await nuevoUsuario.save();

    res.status(201).json({ message: "Usuario registrado correctamente." });
  } catch (error) {
    res.status(500).json({ message: "Error al registrar usuario.", error });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar
    const usuario = await User.findOne({ email });
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado." });

    const passwordValido = await usuario.compararPassword(password);
    if (!passwordValido) return res.status(401).json({ message: "Credenciales inválidas." });

    // Generar token
    const token = jwt.sign(
      { id: usuario._id, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: "30d" } // ⏳ Token válido por 30 días
    );

    res.json({
      token,
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error al iniciar sesión.", error });
  }
};

module.exports = {
  registrar,
  login,
};
