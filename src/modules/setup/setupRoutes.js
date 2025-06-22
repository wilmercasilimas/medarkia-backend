const express = require("express");
const User = require("../user/User");
const router = express.Router();

/**
 * Ruta de configuración inicial.
 * Permite crear un usuario admin si no hay usuarios en la base de datos.
 * Esta ruta se debe ELIMINAR o COMENTAR después de usarla.
 */

router.post("/admin-temporal", async (req, res) => {
  try {
    // const usuarios = await User.find();
    // if (usuarios.length > 0) {
    //   return res.status(403).json({
    //     message: "Ya existen usuarios en el sistema. Esta ruta ya no es válida.",
    //   });
    // }

    const { nombre, apellido, email, password, telefono } = req.body;

    if (!nombre || !apellido || !email || !password || !telefono) {
      return res
        .status(400)
        .json({ message: "Todos los campos son obligatorios." });
    }

    // 👇 Aquí NO se hace hash manualmente
    const nuevoUsuario = new User({
      nombre,
      apellido,
      email,
      password, // ← texto plano, será hasheado por el modelo
      telefono,
      rol: "admin",
      avatar: {
        url: process.env.DEFAULT_AVATAR_URL,
        public_id: null,
      },
    });

    await nuevoUsuario.save();

    res.status(201).json({
      message: "✅ Usuario administrador creado correctamente.",
      usuario: {
        id: nuevoUsuario._id,
        email: nuevoUsuario.email,
        nombre: nuevoUsuario.nombre,
        rol: nuevoUsuario.rol,
      },
    });
  } catch (error) {
    console.error("❌ Error en setup:", error);
    res.status(500).json({ message: "Error al crear el usuario inicial." });
  }
});

module.exports = router;
