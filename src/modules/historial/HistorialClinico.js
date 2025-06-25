const mongoose = require("mongoose");

const historialClinicoSchema = new mongoose.Schema(
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
      required: true,
    },
    fecha: {
      type: Date,
      default: Date.now,
    },
    motivoConsulta: {
      type: String,
      trim: true,
    },
    diagnostico: {
      type: String,
      trim: true,
    },
    tratamiento: {
      type: String,
      trim: true,
    },
    observaciones: {
      type: String,
      trim: true,
    },
    archivos: [
      {
        url: String,
        public_id: String,
        tipo: String, // opcional: "imagen", "pdf", etc.
        nombreOriginal: String,
      },
    ],
    cambios: [
      {
        fecha: { type: Date, default: Date.now },
        editado_por: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        motivoConsulta: String,
        diagnostico: String,
        tratamiento: String,
        observaciones: String,
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
    timestamps: true, // createdAt, updatedAt
  }
);

module.exports = mongoose.model("HistorialClinico", historialClinicoSchema);
