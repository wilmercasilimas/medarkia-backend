const { subirImagen, eliminarImagen } = require("./cloudinaryHelper");

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
    await eliminarImagen(publicIdAnterior);
  }

  // Subir nuevo avatar
  const resultado = await subirImagen(archivo.path);
  nuevoAvatar.url = resultado.secure_url;
  nuevoAvatar.public_id = resultado.public_id;

  return nuevoAvatar;
};

module.exports = { procesarAvatar };
