## 📅 RUTA DE DESARROLLO MEDARKIA (ROADMAP)

### ✅ ESTADO ACTUAL – FUNCIONALIDADES IMPLEMENTADAS

**Backend estable y probado:**

* Usuarios (CRUD completo, validaciones Joi, control de roles, avatares)
* Doctores, Especialidades y Asistentes (asignaciones, relaciones, filtros y permisos)
* Citas médicas (creación, edición, cancelación, notificación vía email/WhatsApp)
* Historial clínico (CRUD, archivos, validación por rol y propiedad, restricción de edición)
* Recetas médicas (CRUD completo, archivos adjuntos, notificaciones, control de acceso)
* Pacientes (vinculación a usuarios, visibilidad por doctor/asistente)
* Validaciones Joi con mensajes personalizados
* Logging profesional (Winston)
* Middleware de roles y validación de propiedad (`validarPropiedadPorId.js`)

---

### 🔄 PENDIENTES DEL ITINERARIO ANTERIOR

#### 🦉 Críticos:

* 🕵️ Auditoría de historial clínico: subdocumento `cambios[]` en edición
* 📦 Pruebas Postman finales con datos reales + exportación de entorno

#### ⚙️ Opcionales:

* 🔐 Middleware global de validación de propiedad (otros módulos)
* 🚑 Centralización de permisos repetidos
* 🔮 Tests unitarios / integración (Jest + Supertest)

---

### 🗺️ HOJA DE RUTA EVOLUTIVA

#### 🟩 MVP (Mínimo Producto Viable) – 100% backend funcional

* [ ] Auditoría de historial clínico (registro `cambios[]`)
* [ ] Documentación Postman + archivo `.env.example`

#### 🟨 V2 – Optimización clínica y frontend

**Backend:**

* [ ] Búsqueda avanzada global
* [ ] Soporte completo para múltiples archivos (PDF, JPG, audio)
* [ ] Módulo de interconsultas / referencias entre doctores
* [ ] Observaciones privadas (solo visibles para doctor)
* [ ] Exportación de datos (PDF / CSV)
* [ ] Reprogramación de citas

**Frontend:**

* [ ] Dashboards por rol
* [ ] Visualizador de recetas / historiales
* [ ] Vista resumen de paciente
* [ ] Formularios inteligentes con autocompletado

#### 🔴 V3 – Escalabilidad, IA, negocio

* [ ] Sugerencias con IA para diagnósticos o medicamentos
* [ ] App móvil (React Native o PWA)
* [ ] Firma digital o hash legal del doctor
* [ ] Geolocalización para citas
* [ ] Módulo de pagos (Stripe, MercadoPago)
* [ ] Roles extendidos (enfermeros, visitadores médicos, etc.)
* [ ] Log completo tipo Git por cada entrada clínica

---

### ⏳ TIEMPOS ESTIMADOS

| Fase      | Tareas clave                        | Tiempo estimado |
| --------- | ----------------------------------- | --------------- |
| MVP Final | Auditoría historial + pruebas + doc | 1 semana        |
| V2        | Funciones clínicas + frontend base  | 4-6 semanas     |
| V3        | IA + escalado y negocio             | 8-12 semanas    |

---

⚖️ **Recomendación final**: mantener enfoque modular, validaciones exhaustivas y experiencia fluida por rol. La fase V2 debe priorizar el frontend para operativizar lo ya logrado en backend.
