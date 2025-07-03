// src/modules/bloqueo/BloqueoHorario.js
const mongoose = require("mongoose");

const bloqueoHorarioSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    fecha: {
      type: Date,
      required: true,
    },
    horaInicio: {
      type: String, // Formato "HH:mm"
      required: true,
    },
    horaFin: {
      type: String, // Formato "HH:mm"
      required: true,
    },
    motivo: {
      type: String,
      default: "Bloqueo manual",
    },
    creado_por: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BloqueoHorario", bloqueoHorarioSchema);
