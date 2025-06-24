const Joi = require("joi");
const mongoose = require("mongoose");

// Validador de ObjectId
const esObjectIdValido = (valor, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(valor)) {
    return helpers.message("ID no válido.");
  }
  return valor;
};

// 📌 Esquema para crear historial
const esquemaCrear = Joi.object({
  paciente: Joi.string().custom(esObjectIdValido).required(),
  doctor: Joi.string().custom(esObjectIdValido).required(),
  especialidad: Joi.string().custom(esObjectIdValido).required(),
  fecha: Joi.date().optional(),
  motivoConsulta: Joi.string().max(500).optional().allow(""),
  diagnostico: Joi.string().max(1000).optional().allow(""),
  tratamiento: Joi.string().max(1000).optional().allow(""),
  observaciones: Joi.string().max(1000).optional().allow(""),
});

// 📌 Esquema para editar historial
const esquemaEditar = Joi.object({
  motivoConsulta: Joi.string().max(500).optional().allow(""),
  diagnostico: Joi.string().max(1000).optional().allow(""),
  tratamiento: Joi.string().max(1000).optional().allow(""),
  observaciones: Joi.string().max(1000).optional().allow(""),
});

// Middleware para crear
const validarCrearHistorial = (req, res, next) => {
  const { error } = esquemaCrear.validate(req.body, { abortEarly: false });
  if (error) {
    const errores = error.details.map((e) => e.message);
    return res.status(400).json({ message: "Datos inválidos", errores });
  }
  next();
};

// Middleware para editar
const validarEditarHistorial = (req, res, next) => {
  const { error } = esquemaEditar.validate(req.body, { abortEarly: false });
  if (error) {
    const errores = error.details.map((e) => e.message);
    return res.status(400).json({ message: "Datos inválidos", errores });
  }
  next();
};

module.exports = {
  validarCrearHistorial,
  validarEditarHistorial,
};
