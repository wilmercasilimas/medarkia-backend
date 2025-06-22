const Joi = require("joi");
const mongoose = require("mongoose");

const esObjectIdValido = (value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.message("ID no válido.");
  }
  return value;
};

const esquemaDoctor = Joi.object({
  usuario: Joi.string().custom(esObjectIdValido).optional(),
  especialidad: Joi.string().custom(esObjectIdValido).optional(),
  estado: Joi.string().valid("activo", "inactivo").optional(),
});

const validarDoctor = (req, res, next) => {
  const { error } = esquemaDoctor.validate(req.body, { abortEarly: false });

  if (error) {
    const errores = error.details.map((e) => e.message);
    return res.status(400).json({ message: "Datos inválidos", errores });
  }

  next();
};

module.exports = validarDoctor;
