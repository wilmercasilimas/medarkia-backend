// 📁 src/modules/archivo/validarArchivo.js
const HistorialClinico = require("../historial/HistorialClinico");

const validarArchivo = async (req, res, next) => {
  try {
    const { public_id } = req.params;
    const usuario = req.user;

    const historial = await HistorialClinico.findOne({ "archivos.public_id": public_id });
    if (!historial) {
      return res.status(404).json({ message: "Archivo no encontrado." });
    }

    const esAdmin = usuario.rol === "admin";
    const esDoctor = usuario.rol === "doctor" && historial.doctor?.toString() === usuario._id.toString();
    const esPaciente = usuario.rol === "paciente" && historial.paciente?.toString() === usuario._id.toString();

    if (!esAdmin && !esDoctor && !esPaciente) {
      return res.status(403).json({ message: "No tienes permiso para acceder a este archivo." });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: "Error al validar archivo." });
  }
};

module.exports = validarArchivo;
