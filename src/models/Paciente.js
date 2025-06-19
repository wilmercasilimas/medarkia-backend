const mongoose = require("mongoose");

const pacienteSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true,
  },
  apellido: {
    type: String,
    required: true,
    trim: true,
  },
  cedula: {
    type: String,
    required: true,
    unique: true,
  },
  telefono: {
    type: String,
    default: "",
  },
  direccion: {
    type: String,
    default: "",
  },
  email: {
    type: String,
    required: false,
    lowercase: true,
    trim: true,
  },
  sexo: {
    type: String,
    enum: ["masculino", "femenino", "otro"],
    required: true,
  },
  fecha_nacimiento: {
    type: Date,
    required: true,
  },
  especialidad_asignada: {
    type: String,
    required: true,
  },
  estado: {
    type: String,
    enum: ["activo", "inactivo"],
    default: "activo",
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model("Paciente", pacienteSchema);
