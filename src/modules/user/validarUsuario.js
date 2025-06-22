const Joi = require("joi");

const esquemaUsuario = Joi.object({
  nombre: Joi.string().trim().min(2).max(50).optional(),
  apellido: Joi.string().trim().min(2).max(50).optional(),
  email: Joi.string().email().lowercase().optional(),
  password: Joi.string().min(6).optional(),
  telefono: Joi.string().pattern(/^[0-9\-\+\s()]{6,20}$/).optional(),
  rol: Joi.string().valid("admin", "doctor", "asistente", "paciente").optional(),
});

const validarUsuario = (req, res, next) => {
  const { error } = esquemaUsuario.validate(req.body, { abortEarly: false, allowUnknown: true });

  if (error) {
    const mensajes = error.details.map((detalle) => detalle.message);
    return res.status(400).json({ message: "Datos inválidos.", errores: mensajes });
  }

  next();
};

module.exports = validarUsuario;
