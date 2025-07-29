const mongoose = require("mongoose");
const RecetaMedica = require("../modules/receta/RecetaMedica");
const HistorialClinico = require("../modules/historial/HistorialClinico");
const Cita = require("../modules/cita/Cita"); // ✅ Se agrega Cita
const logger = require("../config/logger");

/**
 * Middleware para validar si el usuario actual es propietario del recurso.
 * Soporta: receta | historial | cita
 * - Los admins siempre tienen acceso.
 * - Los doctores solo pueden acceder a los recursos que crearon (o asignados).
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
          if (!recurso) {
            return res.status(404).json({ message: "Receta no encontrada." });
          }
          if (recurso.creado_por?.toString() !== req.user._id.toString()) {
            return res.status(403).json({
              message: "No tienes permiso para modificar esta receta.",
            });
          }
          break;

        case "historial":
          recurso = await HistorialClinico.findById(id);
          if (!recurso) {
            return res
              .status(404)
              .json({ message: "Historial no encontrado." });
          }
          if (recurso.creado_por?.toString() !== req.user._id.toString()) {
            return res.status(403).json({
              message: "No tienes permiso para modificar este historial.",
            });
          }
          break;

        case "cita":
          recurso = await Cita.findById(id)
            .populate({
              path: "doctor",
              populate: { path: "usuario", select: "_id" },
            })
            .populate({
              path: "paciente",
              populate: { path: "usuario", select: "_id" },
            });

          if (!recurso) {
            return res.status(404).json({ message: "Cita no encontrada." });
          }

          const userId = req.user._id.toString();
          const rol = req.user.rol;

          console.log("🔎 VALIDANDO:", {
            rol,
            userId,
            doctor: recurso.doctor?.usuario?._id?.toString(),
            paciente: recurso.paciente?.usuario?._id?.toString(),
            tokenPayload: req.user,
          });

          const esDoctorAsignado =
            rol === "doctor" &&
            recurso.doctor?.usuario?._id?.toString() === userId;

          const esAsistente =
            rol === "asistente" && recurso.doctor?.asistentes?.includes(userId);

          const esPaciente =
            rol === "paciente" &&
            recurso.paciente?.usuario?._id?.toString() === userId;

          if (esDoctorAsignado || esAsistente || esPaciente) {
            break;
          }

          return res.status(403).json({
            message: "No tienes permiso para modificar esta cita.",
          });

        default:
          return res
            .status(500)
            .json({ message: "Tipo de recurso no soportado." });
      }

      next();
    } catch (error) {
      logger.error(
        `❌ Error en validarPropietarioRecurso (${tipo}): ${error.message}`
      );
      res.status(500).json({ message: "Error de autorización." });
    }
  };
};

module.exports = validarPropietarioRecurso;
