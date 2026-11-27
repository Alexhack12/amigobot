# Modelo de identidad, permisos y consentimiento

## Fuente de verdad

Firebase Authentication acredita la identidad. El backend verifica el ID token, incluida revocación, y obtiene el `uid` canónico del token. Firestore aporta atributos de aplicación; nunca puede sustituir la identidad autenticada.

La autorización es una decisión del backend basada en:

```text
actor + contexto + capacidad + recurso + relación + consentimiento + estado
```

Ocultar botones en React mejora experiencia, pero no concede ni revoca permisos.

## Estados actuales compatibles

| Actor | Condición actual | Capacidades actuales |
|---|---|---|
| Usuario personal | `role=patient`, no bloqueado | Perfil propio, chat propio, tareas propias, vínculo opcional |
| Profesional pendiente | `role=psychologist`, `verificationStatus=pending` | Perfil propio y verificación; sin funciones profesionales sensibles |
| Profesional rechazado | `role=psychologist`, `verificationStatus=rejected` | Sin funciones profesionales; revisión administrativa futura |
| Profesional verificado | `role=psychologist`, `verificationStatus=approved` | Invitaciones y recursos de pacientes vinculados activos |
| Administrador | `role=admin` | Verificación profesional; no acceso clínico general por defecto |
| Cuenta bloqueada | `blocked=true` | Sin acceso a API protegida |

Un usuario personal puede usar AmigoBot sin vínculo profesional.

## Matriz objetivo de capacidades

| Capacidad | Personal | Profesional pendiente | Profesional verificado | Admin | Personal clínica futuro |
|---|:---:|:---:|:---:|:---:|:---:|
| Usar espacio personal propio | Sí | Sí, si tiene contexto personal | Sí, si tiene contexto personal | Sí, si tiene contexto personal | Sí, si tiene contexto personal |
| Verificar credenciales propias | No | Sí | Solo consulta/renovación | Revisión | No |
| Publicar perfil profesional | No | No | Con opt-in y validación | Moderar | Según scope |
| Gestionar paciente | No | No | Relación + capacidad | No por defecto | Membresía + scope |
| Leer memoria privada | Solo propia | Solo propia | Solo propia | No | No |
| Leer conversación de paciente | Solo propia | No | Consentimiento específico | No por defecto | Consentimiento + scope |
| Leer expediente clínico | Si es titular y la política lo permite | No | Relación + propósito | Soporte excepcional trazado | Scope mínimo |
| Administrar verificaciones | No | No | No | Sí | No |
| Gestionar facturación | Propia | Propia | Propia/consultorio | Operación limitada | Scope de billing |

## Políticas obligatorias

### Identidad

- El cliente nunca envía un `uid` para decidir quién actúa.
- Los ids de recursos se validan, pero la autorización se resuelve por propiedad/relación.
- Tokens revocados, perfiles inexistentes y errores de lectura fallan cerrados.

### Roles y capacidades

- El registro solo crea `patient` o `psychologist` pendiente.
- Ningún endpoint de verificación cambia el rol.
- Solo un administrador puede aprobar o rechazar profesionales.
- Un profesional pendiente/rechazado no obtiene capacidades profesionales.
- En el futuro, capacidades reemplazarán comparaciones crecientes de roles, con fallback al modelo actual.

### Relación profesional-paciente

- La relación debe ser exacta, activa y no derivarse de ids enviados por el cliente.
- La relación identifica un posible contexto de atención; no es consentimiento universal.
- Bloqueo, revocación o cierre de relación deben invalidar nuevos accesos inmediatamente.

### Consentimiento

- Opt-in explícito, nunca preseleccionado.
- Granular por categoría, propósito, destinatario y vigencia.
- Revocable desde el producto.
- La pantalla debe explicar qué se comparte y qué no.
- La API evalúa consentimiento en cada acceso; no basta con que el frontend lo haya mostrado.
- La evidencia de consentimiento no guarda el contenido clínico compartido.

## Estado transitorio conocido

Actualmente `verifyPatientAccess` autoriza recursos profesionales cuando existe un vínculo activo. Esto preserva el producto existente, pero no satisface todavía el modelo 2.0 de consentimiento granular. Antes de añadir Connect, expediente o memoria avanzada debe introducirse `consents` en paralelo y hacer que las políticas de conversación/memoria exijan una autorización específica.

No se recomienda cortar inmediatamente el acceso actual en producción: sería una migración de comportamiento. Debe habilitarse por feature flag, comunicar el cambio y ofrecer al paciente una elección explícita.

## Perfil público profesional

El directorio consumirá una proyección separada con allowlist. Puede contener nombre público, ubicación general, modalidades, idiomas, tarifas, disponibilidad y especialidades con indicador `verified` o `declared`. Nunca incluirá:

- cédula completa o documento de identidad;
- correo privado o ids internos;
- estado de soporte/fraude;
- pacientes, vínculos, conversaciones o memoria;
- notas, expedientes o documentos de verificación.

## Administración y soporte

Administración no equivale a acceso clínico. Una futura herramienta de soporte excepcional debe exigir ticket/motivo, duración limitada, campos mínimos y evento de auditoría. Las operaciones masivas requieren doble confirmación y dry-run.

## Pruebas mínimas por endpoint

1. Sin token → 401.
2. Token revocado → 401.
3. Perfil inexistente o bloqueado → 403.
4. Rol/estado incorrecto → 403.
5. Actor correcto, recurso ajeno → 403/404 sin enumeración.
6. Relación inactiva o de otro profesional → denegado.
7. Consentimiento ausente/revocado → denegado cuando se active el modelo 2.0.
8. Entrada inválida → 400 sin escritura parcial.
9. Error de dependencia → fallo cerrado y respuesta genérica.
10. La respuesta no contiene campos fuera del contrato público.
