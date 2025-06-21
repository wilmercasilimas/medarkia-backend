const validarRol = (...rolesPermitidos) => {
  if (!rolesPermitidos.length) {
    throw new Error("Debes especificar al menos un rol permitido.");
  }

  return (req, res, next) => {
    const rolUsuario = req.user?.rol;

    if (!rolesPermitidos.includes(rolUsuario)) {
      return res.status(403).json({ message: "Acceso denegado: rol no autorizado." });
    }

    next();
  };
};

module.exports = validarRol;
