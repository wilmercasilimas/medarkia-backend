const validarRol = (...rolesPermitidos) => {
  return (req, res, next) => {
    const rolUsuario = req.user?.rol;

    if (!rolesPermitidos.includes(rolUsuario)) {
      return res.status(403).json({ message: "Acceso denegado: rol no autorizado." });
    }

    next();
  };
};

module.exports = validarRol;
