const Joi = require("joi");

const schema = Joi.object({
  password_actual: Joi.string().min(4).required(),
  password_nueva: Joi.string().min(4).required(),
});

module.exports = (req, res, next) => {
     console.log(">> validarPassword activado");
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errores = error.details.map((e) => e.message);
    return res.status(400).json({ message: "Datos inválidos.", errores });
  }
  next();
};
