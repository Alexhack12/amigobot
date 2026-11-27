# Roadmap incremental de AmigoBot 2.0

Este roadmap ordena capacidades por dependencias de seguridad. Las fases no son fechas ni autorización de despliegue. Cada una requiere revisión humana antes de iniciar la siguiente.

## Fase 01 — fundamentos de arquitectura

Estado: preparada para revisión.

- Consolidar auditoría y baseline de dependencias.
- Documentar arquitectura, datos, acceso y memoria actual.
- Definir monolito modular y reglas de dependencia.
- Mantener compatibilidad y no crear módulos vacíos.
- Automatizar pruebas, auditoría y CodeQL.

Salida: documentación de esta carpeta y `SECURITY_AUDIT.md`.

## Fase 02 — identidad, consentimiento y privacidad

Prerequisito: runtime objetivo validado y reglas Firebase probadas en emulador.

- Traducir roles actuales a capacidades compatibles.
- Introducir contextos de cuenta sin migración destructiva.
- Modelar consentimiento versionado y revocable.
- Separar vínculo profesional de acceso a datos.
- Añadir eventos de auditoría sin contenido clínico.
- Diseñar exportación, eliminación y retención.
- Añadir pruebas de autorización con Firebase Emulator.

Criterio de salida: una vinculación por sí sola no concede lectura de conversaciones, memoria o expediente.

## Fase 03 — AmigoBot Personal y perfil modular

- Separar perfil personal de identidad y perfil profesional.
- Preferencias con allowlist, límites y endpoints backend.
- Feature flags backend.
- Flujos de consentimiento comprensibles.
- Mantener chat y dashboards actuales.

## Fase 04 — Memory Engine controlable

- Implementar repositorio de memorias independiente.
- Procedencia, confianza, temporalidad y estado.
- Confirmación/corrección/eliminación por el usuario.
- Recuperación limitada por propósito y presupuesto.
- Evaluación de contaminación de contexto y fuga cruzada.

No migrar automáticamente resúmenes actuales sin revisión de calidad y consentimiento.

## Fase 05 — Professional y expediente

- Expediente clínico formal separado de memoria privada.
- Notas profesionales, tareas y documentos con políticas por recurso.
- Consentimientos de compartición y revocación.
- Acceso futuro de personal de clínica con membresías y scopes.
- Registro de acceso y exportación profesional controlada.

## Fase 06 — Connect y citas

- Proyección pública del profesional verificado.
- Diferenciar credenciales verificadas y datos declarados.
- Búsqueda, filtros y ubicación general.
- Disponibilidad, solicitudes y reservas.
- Usuarios sin psicólogo pueden explorar y solicitar consulta.
- Antispam, moderación y protección frente a enumeración.

## Fase 07 — Clinical Copilot

- Casos de uso asistivos delimitados.
- Datos mínimos, salida estructurada y revisión humana.
- Ninguna decisión clínica o permiso delegado al modelo.
- Evaluaciones de calidad, seguridad, sesgo y costo.

## Fase 08 — Business y operación

- Suscripciones y facturación aisladas.
- Integración de pago solo con autorización específica.
- Webhooks firmados, idempotencia y conciliación.
- Soporte, métricas y acuerdos de retención.

## Puertas comunes de cada fase

1. Modelo de amenaza actualizado.
2. Contratos de API documentados.
3. Migración reversible o ausencia explícita de migración.
4. Pruebas unitarias, autorización, integración y build.
5. `npm audit` y CodeQL sin hallazgos críticos abiertos.
6. Staging con datos ficticios.
7. Plan de monitoreo y rollback.
8. Aprobación humana antes de producción y antes de la fase siguiente.
