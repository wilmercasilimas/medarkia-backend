const Joi = require("joi");
const mongoose = require("mongoose");

const esObjectId = (valor, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(valor)) {
    return helpers.message("ID no válido.");
  }
  return valor;
};

const esquemaCita = Joi.object({
  paciente: Joi.string().custom(esObjectId).required(),
  doctor: Joi.string().custom(esObjectId).required(),
  especialidad: Joi.string().custom(esObjectId).optional().allow(null),
  fecha: Joi.date().required(),
  horaInicio: Joi.string().pattern(/^\d{2}:\d{2}$/).required(), // formato HH:mm
  horaFin: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
  estado: Joi.string().valid("pendiente", "completada", "cancelada").optional(),
  observaciones: Joi.string().allow("", null).optional(),
});

const validarCita = (req, res, next) => {
  const { error } = esquemaCita.validate(req.body, { abortEarly: false });
  if (error) {
    const errores = error.details.map(e => e.message);
    return res.status(400).json({ message: "Datos inválidos", errores });
  }
  next();
};

module.exports = validarCita;
