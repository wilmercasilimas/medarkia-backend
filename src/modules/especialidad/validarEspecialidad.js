const Joi = require("joi");

const esquemaEspecialidad = Joi.object({
  nombre: Joi.string().min(3).max(50).required().messages({
    "string.empty": "El nombre es obligatorio.",
    "string.min": "El nombre debe tener al menos 3 caracteres.",
    "string.max": "El nombre no puede tener más de 50 caracteres.",
    "any.required": "El nombre es obligatorio.",
  }),
  descripcion: Joi.string().max(255).allow("").messages({
    "string.max": "La descripción no puede tener más de 255 caracteres.",
  }),
});

const validarEspecialidad = (req, res, next) => {
  const { error } = esquemaEspecialidad.validate(req.body, { abortEarly: false });

  if (error) {
    const mensajes = error.details.map((e) => e.message);
    return res.status(400).json({ errores: mensajes });
  }

  next();
};

module.exports = validarEspecialidad;
