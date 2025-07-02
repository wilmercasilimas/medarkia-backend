const mongoose = require("mongoose");
const RecetaMedica = require("../modules/receta/RecetaMedica");
const HistorialClinico = require("../modules/historial/HistorialClinico");
const logger = require("../config/logger");

/**
 * Middleware para validar si el usuario actual es propietario del recurso.
 * Soporta: receta | historial
 * - Los admins siempre tienen acceso.
 * - Los doctores solo pueden acceder a los recursos que crearon.
 */
const validarPropietarioRecurso = (tipo) => {
  return async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "ID inválido." });
      }

      if (req.user.rol === "admin") return next();

      let recurso;
      switch (tipo) {
        case "receta":
          recurso = await RecetaMedica.findById(id);
          break;
        case "historial":
          recurso = await HistorialClinico.findById(id);
          break;
        default:
          return res
            .status(500)
            .json({ message: "Tipo de recurso no soportado." });
      }

      if (!recurso) {
        return res.status(404).json({ message: `${tipo} no encontrado.` });
      }

      if (recurso.creado_por?.toString() !== req.user._id.toString()) {
        return res
          .status(403)
          .json({ message: `No tienes permiso para modificar este ${tipo}.` });
      }

      next();
    } catch (error) {
      logger.error(`❌ Error en validarPropietarioRecurso: ${error.message}`);
      res.status(500).json({ message: "Error de autorización." });
    }
  };
};

module.exports = validarPropietarioRecurso;
