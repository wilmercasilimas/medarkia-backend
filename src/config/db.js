const mongoose = require("mongoose");
const logger = require("./logger"); // Asegúrate que la ruta sea correcta

const conectarDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info("✅ Conexión a MongoDB establecida.");
  } catch (error) {
    logger.error("❌ Error al conectar a MongoDB: " + error.message);
    process.exit(1); // Detener ejecución si falla
  }
};

module.exports = conectarDB;
