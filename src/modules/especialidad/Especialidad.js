const mongoose = require("mongoose");

const especialidadSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre de la especialidad es obligatorio"],
      unique: true,
      trim: true,
    },
    descripcion: {
      type: String,
      trim: true,
    },
    creado_en: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  }
);

module.exports = mongoose.model("Especialidad", especialidadSchema);
