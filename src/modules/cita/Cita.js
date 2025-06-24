const mongoose = require("mongoose");

const citaSchema = new mongoose.Schema(
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
      required: true,
    },
    horaInicio: {
      type: String, // formato "HH:mm"
      required: true,
    },
    horaFin: {
      type: String, // formato "HH:mm"
      required: true,
    },
    estado: {
      type: String,
      enum: ["pendiente", "completada", "cancelada"],
      default: "pendiente",
    },
    observaciones: {
      type: String,
      trim: true,
    },
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

module.exports = mongoose.model("Cita", citaSchema);
