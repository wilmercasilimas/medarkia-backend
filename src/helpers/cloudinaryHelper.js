const logger = require("../config/logger");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const subirImagen = async (archivoPath, carpeta = "medarkia/usuarios") => {
  try {
    const resultado = await cloudinary.uploader.upload(archivoPath, {
      folder: carpeta, // ✅ Usa el parámetro recibido
      use_filename: true,
      unique_filename: false,
      overwrite: true,
    });

    if (fs.existsSync(archivoPath)) {
      fs.unlinkSync(archivoPath);
    }

    return {
      url: resultado.secure_url,
      public_id: resultado.public_id,
    };
  } catch (error) {
    logger.error(`❌ Error al subir imagen a Cloudinary: ${error.message}`);

    throw new Error("No se pudo subir la imagen.");
  }
};

const eliminarImagen = async (publicId) => {
  try {
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    }
  } catch (error) {
    logger.error(`❌ Error al eliminar imagen de Cloudinary: ${error.message}`);
  }
};

const obtenerPublicIdDesdeUrl = (url) => {
  try {
    const match = url.match(/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z]+$/);
    return match ? match[1] : null;
  } catch (error) {
    logger.error(`❌ Error extrayendo public_id: ${error.message}`);

    return null;
  }
};

module.exports = {
  subirImagen,
  eliminarImagen,
  obtenerPublicIdDesdeUrl,
};
