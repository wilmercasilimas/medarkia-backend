const { enviarEmail } = require("../../helpers/emailHelper");
const { enviarWhatsapp } = require("../../helpers/whatsappHelper");
const Doctor = require("../doctor/Doctor");
const Paciente = require("../paciente/Paciente");

/**
 * Envía notificaciones por correo y WhatsApp al paciente y doctor al crear o editar una cita.
 * @param {Object} cita - Objeto con los datos de la cita
 * @param {'creada'|'actualizada'} tipoAccion - Tipo de acción realizada
 */
const notificarCita = async (cita, tipoAccion = "creada") => {
  try {
    const doctor = await Doctor.findById(cita.doctor).populate("usuario", "email nombre apellido telefono");
    const paciente = await Paciente.findById(cita.paciente).populate("usuario", "email nombre apellido telefono");

    if (!doctor || !paciente || !doctor.usuario || !paciente.usuario) {
      throw new Error("Doctor o paciente (o su usuario) no encontrados para notificación.");
    }

    const fechaFormateada = new Date(cita.fecha).toLocaleDateString("es-VE");
    const asunto = `📅 Cita médica ${tipoAccion} - Medarkia`;

    // 📧 EMAIL
    const mensajePacienteEmail = `
Hola ${paciente.usuario.nombre},

Tu cita médica ha sido ${tipoAccion} con los siguientes detalles:

👤 Doctor: Dr. ${doctor.usuario.nombre}
🗓️ Fecha: ${fechaFormateada}
⏰ Horario: ${cita.horaInicio} - ${cita.horaFin}
🧬 Especialidad: ${cita.especialidadNombre || "No especificada"}
🗒️ Observaciones: ${cita.observaciones || "Ninguna"}

Gracias por confiar en Medarkia Sistemas.
`;

    const mensajeDoctorEmail = `
Dr. ${doctor.usuario.nombre},

Tienes una cita ${tipoAccion} con el paciente ${paciente.usuario.nombre} el ${fechaFormateada}, entre ${cita.horaInicio} y ${cita.horaFin}.
`;

    await enviarEmail(paciente.usuario.email, asunto, mensajePacienteEmail);
    await enviarEmail(doctor.usuario.email, asunto, mensajeDoctorEmail);

    // 📲 WHATSAPP (profesional, breve, sobrio)
    const mensajePacienteWhatsapp = 
`Hola ${paciente.usuario.nombre},

Tu cita médica ha sido ${tipoAccion}:

👤 *Doctor:* Dr. ${doctor.usuario.nombre}  
🗓️ *Fecha:* ${fechaFormateada}  
⏰ *Horario:* ${cita.horaInicio} - ${cita.horaFin}  
🧬 *Especialidad:* ${cita.especialidadNombre || "No especificada"}  
🗒️ *Observaciones:* ${cita.observaciones || "Ninguna"}

– Medarkia Sistemas`;

    const mensajeDoctorWhatsapp = 
`Dr. ${doctor.usuario.nombre},

Tienes una cita ${tipoAccion} con *${paciente.usuario.nombre}* el *${fechaFormateada}*, de *${cita.horaInicio} a ${cita.horaFin}*.

🧬 Especialidad: ${cita.especialidadNombre || "No especificada"}  
🗒️ Observaciones: ${cita.observaciones || "Ninguna"}

– Medarkia Sistemas`;

    await enviarWhatsapp(paciente.usuario.telefono, mensajePacienteWhatsapp);
    await enviarWhatsapp(doctor.usuario.telefono, mensajeDoctorWhatsapp);

    console.log("✅ Notificaciones por correo y WhatsApp enviadas.");
  } catch (error) {
    console.error("❌ Error en notificarCita:", error.message);
  }
};

module.exports = { notificarCita };
