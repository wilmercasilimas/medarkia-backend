// Esta función se ejecutará al crear o editar una cita
const enviarNotificacionCita = async (cita) => {
  // 🔔 Aquí se implementará el envío de email o WhatsApp
  console.log("📬 Notificación simulada para cita:", String(cita._id));
};

module.exports = { enviarNotificacionCita };
