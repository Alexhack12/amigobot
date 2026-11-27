# Modelo de datos y límites de información

## Estado actual de Firestore

El modelo es documental y no tiene migraciones versionadas. Los nombres siguientes proceden del código actual. La documentación histórica menciona `inviteCodes`, pero el código usa `invitationCodes`; no debe renombrarse sin una migración compatible.

| Colección | Propósito actual | Propietario / acceso esperado | Sensibilidad |
|---|---|---|---|
| `users` | Perfil, rol, estado de verificación y bloqueo | Usuario lee el propio; backend administra | Personal/administrativa |
| `invitationCodes` | Vincular paciente con profesional | Backend; creador profesional y consumidor paciente | Interna |
| `psychologistPatients` | Relación entre profesional y paciente | Backend y actores vinculados según política | Confidencial |
| `conversations` | Metadatos, resumen y análisis por conversación | Paciente propietario; análisis interno por backend | Altamente sensible |
| `chatMessages` | Texto y análisis por mensaje | Paciente propietario; backend | Altamente sensible |
| `behavioralReports` | Reportes para seguimiento profesional | Profesional autorizado; nunca paciente | Altamente sensible |
| `patientTasks` | Tareas asignadas y estado | Profesional autorizado y paciente objetivo | Confidencial |

Las reglas versionadas permiten al cliente leer únicamente su `users/{uid}` y crear su perfil inicial acotado. El resto se deniega al cliente y se opera mediante backend.

## Campos relevantes actuales

### `users/{uid}`

- Identidad de aplicación: `uid`, `name`, `email`.
- Autorización heredada: `role` (`patient`, `psychologist`, `admin`).
- Verificación: `verificationStatus`, `cedula`, `cedulaData`, fechas y actor de decisión.
- Acceso: `blocked`, `blockedByPsychologistId`.
- Vínculo auxiliar: `linkedPsychologistId`.
- Timestamps.

Riesgo: mezcla perfil, autorización, verificación y estado operativo. No añadir preferencias o facturación a este documento.

### `psychologistPatients/{linkId}`

- `psychologistId`, `patientId`.
- Datos duplicados de presentación del paciente.
- `active`, `blocked`, timestamps.

Riesgo: hoy el vínculo activo funciona como autorización para reportes, conversaciones y tareas. En 2.0 deberá ser solo la relación; el acceso a cada categoría dependerá de consentimientos separados.

### `conversations/{conversationId}`

- `userId`, `title`, `messageCount`.
- Resumen, emoción, riesgo, factores, señales, tendencia y recomendaciones.
- Timestamps.

Riesgo: combina metadatos visibles y análisis internos. El API ya serializa una vista reducida para el paciente, pero la siguiente evolución debe separar físicamente análisis profesional y conversación privada.

### `chatMessages/{messageId}`

- `userId`, `conversationId`, `sender`, `text`.
- Análisis interno en mensajes del bot.
- Timestamp.

Las consultas deben filtrar por propietario además del identificador de conversación. No se deben registrar textos en logs.

### `behavioralReports/{reportId}`

- `userId`, `conversationId`, título.
- Emoción, riesgo, resumen, cambios, factores y recomendaciones.
- `visibleToPatient: false`.
- Timestamp.

No es diagnóstico ni expediente clínico formal.

## Clasificación objetivo

| Clase | Ejemplos | Política base |
|---|---|---|
| Público | Nombre profesional publicado, especialidades declaradas | Opt-in y proyección separada |
| Personal | Nombre, preferencias, contacto | Propietario y operación mínima |
| Privado | Conversaciones y memoria personal | Solo usuario; compartir por consentimiento explícito |
| Clínico | Expediente, notas y documentos profesionales | Paciente/profesional por relación y propósito |
| Administrativo | Verificación, fraude, soporte, auditoría | Personal autorizado y trazable |
| Financiero | Suscripción, facturas, proveedor de pago | Sistema aislado; no mezclar con clínico |

## Entidades futuras propuestas

No se crean todavía. Los nombres son conceptuales:

- `accountContexts`: contextos/capacidades por cuenta.
- `professionalProfiles`: perfil operativo privado.
- `publicProfessionalProfiles`: proyección pública aprobada.
- `professionalCredentials`: evidencia y estado de verificación, nunca pública.
- `consents`: sujeto, destinatario, categoría, propósito, versión, vigencia y revocación.
- `memoryItems`: memoria privada con tipo, procedencia, confianza y temporalidad.
- `clinicalRecords` y `professionalNotes`: expediente separado de memoria.
- `appointments`, `availabilityRules`, `consultationRequests`.
- `auditEvents`: actor, acción, recurso, resultado y metadatos no sensibles.
- `schemaMigrations`: idempotencia y trazabilidad de cambios.

## Consentimiento y revocación

Un consentimiento debe identificar:

- quién comparte;
- quién recibe;
- categoría exacta (`conversation_summary`, `task_progress`, etc.);
- propósito;
- versión del texto aceptado;
- inicio y expiración;
- estado de revocación;
- recurso o alcance.

Revocar impide accesos futuros, pero no borra automáticamente un registro clínico que exista por una obligación legítima. Retención y eliminación deben documentarse por categoría y jurisdicción antes de implementar.

## Estrategia de migración

1. Añadir nuevos modelos en paralelo.
2. Leer primero el modelo nuevo y usar fallback heredado durante transición.
3. Ejecutar backfill idempotente en staging con datos ficticios.
4. Comparar conteos y muestras anonimizadas.
5. Activar escritura dual solo si es indispensable y temporal.
6. Cambiar lectura mediante feature flag.
7. Conservar rollback hasta completar verificación.
8. No eliminar campos heredados en la misma fase.
