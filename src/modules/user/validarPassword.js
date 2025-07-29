const Joi = require("joi");

const schema = Joi.object({
  password_actual: Joi.string().min(4).required(),
  password_nueva: Joi.string().min(4).required(),
});

module.exports = (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    req.body.password_actual = req.body.password_actual?.trim();
    req.body.password_nueva = req.body.password_nueva?.trim();

    const errores = error.details.map((e) => e.message);
    return res.status(400).json({ message: "Datos inválidos.", errores });
  }
  next();
};
