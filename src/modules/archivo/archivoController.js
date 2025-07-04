// 📁 src/modules/archivo/archivoController.js
const HistorialClinico = require("../historial/HistorialClinico");
const logger = require("../../config/logger");

const descargarArchivo = async (req, res) => {
  try {
    const { public_id } = req.params;
    const usuario = req.user;

    const historial = await HistorialClinico.findOne({
      "archivos.public_id": public_id,
    }).populate("paciente doctor");

    if (!historial) {
      return res.status(404).json({ message: "Archivo no encontrado." });
    }

    const esAdmin = usuario.rol === "admin";
    const esDoctor = usuario.rol === "doctor" && historial.doctor?.toString() === usuario._id.toString();
    const esPaciente = usuario.rol === "paciente" && historial.paciente?.toString() === usuario._id.toString();

    if (!esAdmin && !esDoctor && !esPaciente) {
      return res.status(403).json({ message: "No tienes permiso para descargar este archivo." });
    }

    const archivo = historial.archivos.find((a) => a.public_id === public_id);
    if (!archivo) {
      return res.status(404).json({ message: "Archivo no encontrado en el historial." });
    }

    res.setHeader("Content-Disposition", `attachment; filename=\"${archivo.nombreOriginal}\"`);
    res.setHeader("Content-Type", archivo.tipo);
    res.redirect(archivo.url);
  } catch (error) {
    logger.error(`❌ Error al descargar archivo: ${error.message}`);
    res.status(500).json({ message: "Error al intentar descargar el archivo." });
  }
};

const vistaPreviaArchivo = async (req, res) => {
  try {
    const { public_id } = req.params;
    const usuario = req.user;

    const historial = await HistorialClinico.findOne({
      "archivos.public_id": public_id,
    }).populate("paciente doctor");

    if (!historial) {
      return res.status(404).json({ message: "Archivo no encontrado." });
    }

    const esAdmin = usuario.rol === "admin";
    const esDoctor = usuario.rol === "doctor" && historial.doctor?.toString() === usuario._id.toString();
    const esPaciente = usuario.rol === "paciente" && historial.paciente?.toString() === usuario._id.toString();

    if (!esAdmin && !esDoctor && !esPaciente) {
      return res.status(403).json({ message: "No tienes permiso para ver este archivo." });
    }

    const archivo = historial.archivos.find((a) => a.public_id === public_id);
    if (!archivo) {
      return res.status(404).json({ message: "Archivo no encontrado en el historial." });
    }

    res.setHeader("Content-Disposition", `inline; filename=\"${archivo.nombreOriginal}\"`);
    res.setHeader("Content-Type", archivo.tipo);
    res.redirect(archivo.url);
  } catch (error) {
    logger.error(`❌ Error en vista previa: ${error.message}`);
    res.status(500).json({ message: "Error al mostrar el archivo." });
  }
};

module.exports = {
  descargarArchivo,
  vistaPreviaArchivo,
};
