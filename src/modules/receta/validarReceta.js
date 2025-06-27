const Joi = require("joi");

// Función que genera el esquema dinámicamente
const getRecetaSchema = (esEdicion = false) => {
  const base = esEdicion ? Joi.optional() : Joi.required();

  return Joi.object({
    paciente: Joi.string()[esEdicion ? "optional" : "required"]().messages({
      "any.required": "El paciente es obligatorio.",
      "string.base": "El paciente debe ser un ID válido.",
    }),
    doctor: Joi.string()[esEdicion ? "optional" : "required"]().messages({
      "any.required": "El doctor es obligatorio.",
      "string.base": "El doctor debe ser un ID válido.",
    }),
    fecha: Joi.date()[esEdicion ? "optional" : "required"]().messages({
      "any.required": "La fecha es obligatoria.",
      "date.base": "La fecha debe tener un formato válido (YYYY-MM-DD).",
    }),
    diagnostico: Joi.string().allow("").messages({
      "string.base": "El diagnóstico debe ser un texto.",
    }),
    indicaciones: Joi.string().allow("").messages({
      "string.base": "Las indicaciones deben ser un texto.",
    }),
    medicamentos: Joi.alternatives([
      Joi.array().items(
        Joi.object({
          nombre: Joi.string().required().messages({
            "any.required": "Cada medicamento debe tener un nombre.",
            "string.base": "El nombre del medicamento debe ser un texto.",
          }),
          dosis: Joi.string().allow(""),
          frecuencia: Joi.string().allow(""),
          duracion: Joi.string().allow(""),
          indicaciones: Joi.string().allow(""),
        })
      ).messages({
        "array.base": "El campo medicamentos debe ser una lista de objetos.",
      }),
      Joi.string().custom((value, helpers) => {
        try {
          const arr = JSON.parse(value);
          if (!Array.isArray(arr)) throw new Error();
          return arr;
        } catch {
          return helpers.error("any.invalid");
        }
      }).messages({
        "any.invalid": "El campo medicamentos debe ser un arreglo válido (JSON).",
      }),
    ])[esEdicion ? "optional" : "required"]().messages({
      "any.required": "El campo medicamentos es obligatorio.",
    }),
  });
};

// Middleware configurable: puede usarse para crear o editar
const validarReceta = (esEdicion = false) => (req, res, next) => {
  const schema = getRecetaSchema(esEdicion);
  const body = {
    paciente: req.body.paciente,
    doctor: req.body.doctor,
    fecha: req.body.fecha,
    diagnostico: req.body.diagnostico,
    indicaciones: req.body.indicaciones,
    medicamentos: req.body.medicamentos,
  };

  const { error } = schema.validate(body, { abortEarly: false });

  if (error) {
    const errores = error.details.map((err) => err.message);
    return res.status(400).json({ message: "Validación fallida.", errores });
  }

  if (typeof req.body.medicamentos === "string") {
    try {
      req.body.medicamentos = JSON.parse(req.body.medicamentos);
    } catch {
      return res.status(400).json({
        message: "El campo medicamentos debe ser un arreglo JSON válido.",
      });
    }
  }

  next();
};

module.exports = {
  validarReceta,
  validarRecetaCreacion: validarReceta(false),
  validarRecetaEdicion: validarReceta(true),
};
