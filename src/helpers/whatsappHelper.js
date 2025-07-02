const twilio = require("twilio");
const logger = require("../config/logger");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const FROM = process.env.TWILIO_WHATSAPP_FROM;

/**
 * Envía WhatsApp usando Twilio.
 * Asegura que el número esté en formato internacional +58.
 * @param {string} numero - Teléfono local o internacional
 * @param {string} mensaje - Contenido del mensaje
 */
const enviarWhatsapp = async (numero, mensaje) => {
  try {
    if (!numero) throw new Error("Número vacío");

    // Limpia y reestructura a formato internacional
    const limpio = numero.replace(/\D/g, "");
    const numeroFormateado = `whatsapp:+58${limpio.slice(-10)}`;

    await client.messages.create({
      from: FROM,
      to: numeroFormateado,
      body: mensaje,
    });

    logger.info(`📲 WhatsApp enviado a ${numeroFormateado}`);
  } catch (error) {
    logger.error(`❌ Error al enviar WhatsApp a ${numero}: ${error.message}`);
  }
};

module.exports = { enviarWhatsapp };
