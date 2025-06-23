const mongoose = require("mongoose");

const pacienteSchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // un usuario solo puede estar asociado a un paciente
    },
    doctorAsignado: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
    },
    estado: {
      type: String,
      enum: ["activo", "inactivo"],
      default: "activo",
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

module.exports = mongoose.model("Paciente", pacienteSchema);
