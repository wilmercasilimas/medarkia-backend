const mongoose = require("mongoose");
const RecetaMedica = require("../modules/receta/RecetaMedica");
const HistorialClinico = require("../modules/historial/HistorialClinico");
const logger = require("../config/logger");

const modelos = {
  receta: RecetaMedica,
  historial: HistorialClinico,
};

const validarPropiedadPorId = (tipo) => {
  return async (req, res, next) => {
    try {
      const { id } = req.params;
      const usuario = req.user;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        logger.warn(`⚠️ ID inválido para ${tipo}.`);
        return res.status(400).json({ message: `ID de ${tipo} inválido.` });
      }

      const Modelo = modelos[tipo];
      if (!Modelo) {
        logger.error(`❌ Tipo de recurso no soportado: ${tipo}`);
        return res
          .status(500)
          .json({
            message: "Validación de propiedad fallida (tipo desconocido).",
          });
      }

      const recurso = await Modelo.findById(id);
      if (!recurso) {
        logger.warn(`⚠️ ${tipo} no encontrado con ID: ${id}`);
        return res.status(404).json({ message: `${tipo} no encontrado.` });
      }

      const esPropietario =
        recurso.creado_por?.toString() === usuario._id.toString();
      const esAdmin = usuario.rol === "admin";

      if (!esPropietario && !esAdmin) {
        logger.warn(
          `⛔ Acceso denegado: Usuario ${usuario._id} no es dueño del ${tipo}.`
        );
        return res
          .status(403)
          .json({ message: `No tienes permiso para modificar este ${tipo}.` });
      }

      next();
    } catch (error) {
      logger.error(
        `❌ Error en validarPropiedadPorId (${tipo}): ${error.message}`
      );
      res
        .status(500)
        .json({ message: "Error al validar propiedad del recurso." });
    }
  };
};

module.exports = validarPropiedadPorId;
