const cloudinary = require("cloudinary").v2;
const fs = require("fs");

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Subir imagen
const subirImagen = async (archivoPath) => {
  try {
    const resultado = await cloudinary.uploader.upload(archivoPath, {
      folder: "medarkia/usuarios",
      use_filename: true,
      unique_filename: false,
      overwrite: true, // ✅ evita acumulación de imágenes
    });

    // Eliminar archivo temporal local
    if (fs.existsSync(archivoPath)) {
      fs.unlinkSync(archivoPath);
    }

    return {
      url: resultado.secure_url,
      public_id: resultado.public_id,
    };
  } catch (error) {
    console.error("❌ Error al subir imagen a Cloudinary:", error);
    throw new Error("No se pudo subir la imagen.");
  }
};

// ✅ Eliminar imagen por public_id
const eliminarImagen = async (publicId) => {
  try {
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    }
  } catch (error) {
    console.error("❌ Error al eliminar imagen de Cloudinary:", error);
  }
};

// ✅ Extraer public_id desde URL completa
const obtenerPublicIdDesdeUrl = (url) => {
  try {
    const match = url.match(/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z]+$/);
    return match ? match[1] : null;
  } catch (error) {
    console.error("Error extrayendo public_id:", error);
    return null;
  }
};

module.exports = {
  subirImagen,
  eliminarImagen,
  obtenerPublicIdDesdeUrl,
};
