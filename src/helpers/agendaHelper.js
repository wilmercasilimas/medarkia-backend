// src/helpers/agendaHelper.js

/**
 * Convierte una cadena "HH:mm" a minutos desde medianoche.
 */
const horaAminutos = (horaStr) => {
  const [horas, minutos] = horaStr.split(":").map(Number);
  return horas * 60 + minutos;
};

/**
 * Convierte minutos desde medianoche a formato "HH:mm".
 */
const minutosAhora = (minutosTotales) => {
  const horas = Math.floor(minutosTotales / 60)
    .toString()
    .padStart(2, "0");
  const minutos = (minutosTotales % 60).toString().padStart(2, "0");
  return `${horas}:${minutos}`;
};

/**
 * Genera bloques de horario entre hora_inicio y hora_fin.
 * Ejemplo: generarIntervalos("08:00", "10:00", 30)
 * Resultado: ["08:00", "08:30", "09:00", "09:30"]
 */
const generarIntervalos = (hora_inicio, hora_fin, duracion_min = 30) => {
  const inicioMin = horaAminutos(hora_inicio);
  const finMin = horaAminutos(hora_fin);
  const bloques = [];

  for (let actual = inicioMin; actual + duracion_min <= finMin; actual += duracion_min) {
    bloques.push(minutosAhora(actual));
  }

  return bloques;
};

/**
 * Filtra los bloques libres eliminando los horarios ocupados.
 * Permite detectar solapamientos exactos con los bloques de duración.
 * 
 * @param {string[]} bloques - Array de horarios ["08:00", "08:30", ...]
 * @param {Array<{horaInicio: string, horaFin: string}>} ocupados - Tramos ocupados.
 * @param {number} duracion_min - Duración de cada bloque a validar
 * @returns {string[]} - Array de horarios disponibles
 */
const filtrarHorariosOcupados = (bloques, ocupados, duracion_min) => {
  return bloques.filter((bloque) => {
    const inicioBloque = horaAminutos(bloque);
    const finBloque = inicioBloque + duracion_min;

    return !ocupados.some((cita) => {
      const inicioOcupado = horaAminutos(cita.horaInicio);
      const finOcupado = horaAminutos(cita.horaFin);

      return inicioBloque < finOcupado && finBloque > inicioOcupado;
    });
  });
};

module.exports = {
  generarIntervalos,
  filtrarHorariosOcupados,
  horaAminutos, // útil si luego necesitas comparar tramos desde el controller
};
