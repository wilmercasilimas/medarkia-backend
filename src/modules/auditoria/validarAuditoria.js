const mongoose = require("mongoose");
const HistorialClinico = require("../historial/HistorialClinico");

const validarAuditoria = (tipo) => {
  return async (req, res, next) => {
    try {
      const { id } = req.params;
      const usuario = req.user;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "ID inválido." });
      }

      if (usuario.rol === "admin") return next();

      if (tipo === "historial") {
        const historial = await HistorialClinico.findById(id);
        if (!historial) {
          return res.status(404).json({ message: "Historial no encontrado." });
        }

        if (
          usuario.rol === "doctor" &&
          historial.doctor.toString() === usuario._id.toString()
        ) {
          return next();
        }

        return res.status(403).json({
          message: "No tienes permiso para ver la auditoría de este historial.",
        });
      }

      return res.status(400).json({ message: "Tipo de auditoría no válido." });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error al validar permisos de auditoría." });
    }
  };
};

module.exports = validarAuditoria;
