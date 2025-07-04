const mongoose = require("mongoose");
const HistorialClinico = require("../historial/HistorialClinico");
const logger = require("../../config/logger");

const verAuditoriaHistorial = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido." });
    }

    const historial = await HistorialClinico.findById(id)
      .populate("cambios.editado_por", "nombre apellido");

    if (!historial) {
      return res.status(404).json({ message: "Historial no encontrado." });
    }

    res.json({ cambios: historial.cambios });
  } catch (error) {
    logger.error("❌ Error al obtener auditoría: " + error.message);
    res.status(500).json({ message: "Error al obtener auditoría." });
  }
};

module.exports = { verAuditoriaHistorial };
