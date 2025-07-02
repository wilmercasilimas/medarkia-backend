const { subirImagen, eliminarImagen } = require("./cloudinaryHelper");
const logger = require("../config/logger");

/**
 * Procesa un avatar nuevo y elimina el anterior si corresponde.
 *
 * @param {Express.Multer.File} archivo - Imagen subida mediante multer
 * @param {{ url: string, public_id: string | null }} avatarAnterior - Objeto de avatar anterior
 * @returns {{ url: string, public_id: string }} - Objeto avatar actualizado
 */
const procesarAvatar = async (archivo, avatarAnterior = {}) => {
  let nuevoAvatar = {
    url: process.env.DEFAULT_AVATAR_URL,
    public_id: null,
  };

  if (!archivo) {
    return avatarAnterior || nuevoAvatar;
  }

  // Eliminar anterior si existe y no es el default
  const publicIdAnterior = avatarAnterior?.public_id;
  if (publicIdAnterior && !publicIdAnterior.includes("default")) {
    try {
      await eliminarImagen(publicIdAnterior);
    } catch (error) {
      logger.warn(`⚠️ No se pudo eliminar avatar anterior: ${error.message}`);
    }
  }

  // Subir nuevo avatar
  let resultado;
  try {
    resultado = await subirImagen(archivo.path);
  } catch (error) {
    logger.error(`❌ Error al subir nuevo avatar: ${error.message}`);
    throw new Error("No se pudo subir el nuevo avatar.");
  }

  nuevoAvatar.url = resultado.secure_url;
  nuevoAvatar.public_id = resultado.public_id;

  return nuevoAvatar;
};

module.exports = { procesarAvatar };
