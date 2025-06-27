const mongoose = require("mongoose");

const recetaMedicaSchema = new mongoose.Schema(
  {
    paciente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Paciente",
      required: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    especialidad: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Especialidad",
    },
    fecha: {
      type: Date,
      required: true,
    },
    diagnostico: {
      type: String,
      trim: true,
    },
    indicaciones: {
      type: String,
      trim: true,
    },
    medicamentos: [
      {
        nombre: { type: String, required: true },
        dosis: { type: String },
        frecuencia: { type: String },
        duracion: { type: String },
      },
    ],
    recomendaciones: {
      type: String,
      trim: true,
    },
    archivos: [
      {
        url: String,
        public_id: String,
        tipo: String,
        nombreOriginal: String,
      },
    ],
    creado_por: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    editado_por: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("RecetaMedica", recetaMedicaSchema);
