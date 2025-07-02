const nodemailer = require("nodemailer");
const logger = require("../config/logger");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // true solo si usas el puerto 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Envía un correo electrónico con el asunto y cuerpo de texto especificado.
 * @param {string} to - Dirección de correo destino
 * @param {string} subject - Asunto del correo
 * @param {string} text - Cuerpo del mensaje
 */
const enviarEmail = async (to, subject, text) => {
  try {
    const info = await transporter.sendMail({
      from: `"MedarkiaSistemas" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
    });

    logger.info(`📧 Correo enviado a ${to}: ${info.messageId}`);
  } catch (error) {
    logger.error(`❌ Error al enviar correo a ${to}: ${error.message}`);
  }
};

module.exports = { enviarEmail };
