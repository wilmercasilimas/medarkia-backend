const Joi = require("joi");
const mongoose = require("mongoose");

// Validador personalizado para ObjectId
const esObjectIdValido = (valor, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(valor)) {
    return helpers.message("ID no válido.");
  }
  return valor;
};

const esquemaPaciente = Joi.object({
  usuario: Joi.string().custom(esObjectIdValido).optional(),
  doctorAsignado: Joi.string().custom(esObjectIdValido).optional().allow(null),
  estado: Joi.string().valid("activo", "inactivo").optional(),
  observaciones: Joi.string().max(500).optional(),
});

const validarPaciente = (req, res, next) => {
  const { error } = esquemaPaciente.validate(req.body, { abortEarly: false });

  if (error) {
    const errores = error.details.map((e) => e.message);
    return res.status(400).json({ message: "Datos inválidos", errores });
  }

  next();
};

module.exports = validarPaciente;
