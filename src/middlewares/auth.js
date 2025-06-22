const jwt = require("jsonwebtoken");
const User = require("../modules/user/User"); // Ajusta la ruta si es necesario

const auth = async (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({ message: "Token no proporcionado." });
  }

  try {
    const decoded = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);
    
    const usuario = await User.findById(decoded.id).select("-password");
    if (!usuario) {
      return res.status(401).json({ message: "Usuario no válido." });
    }

    req.user = usuario; // ✅ Ahora tienes acceso a ._id, .rol, etc.
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token inválido." });
  }
};

module.exports = auth;
