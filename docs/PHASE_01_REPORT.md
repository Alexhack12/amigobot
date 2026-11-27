# Informe de Fase 01 — fundamentos de arquitectura

Fecha: 26 de noviembre de 2026

Rama: `main`

Base inicial: `ff54772` (`Apply blocked user status in real time`)

## Resultado

La Fase 01 establece una dirección de monolito modular sin reubicar masivamente el código ni crear módulos vacíos. Conserva el frontend, backend, Firebase y flujos actuales. Se documentaron límites de dominio, modelo de acceso, clasificación de datos, transición de identidad, estado del motor de memoria y roadmap.

No se implementaron directorio, citas, pagos, memoria avanzada, expediente formal ni personal de clínica.

## Estado inicial

- SPA React/Vite/PWA y API Express ya operativas.
- Firebase Authentication como identidad y Firestore como persistencia.
- Roles heredados `patient`, `psychologist`, `admin`; estados profesionales `pending`, `approved`, `rejected`.
- Conversaciones y análisis conductuales almacenados en las mismas colecciones.
- Un vínculo activo profesional-paciente funciona actualmente como autorización para recursos profesionales.
- Sin modelo granular de consentimiento, migraciones versionadas, feature flags o eventos de auditoría formal.
- Cambios locales de la auditoría de seguridad todavía sin publicar al iniciar esta fase.

La auditoría no dejó vulnerabilidades críticas conocidas en dependencias: los tres `npm audit` reportaron cero. Persisten riesgos operativos detallados en `SECURITY_AUDIT.md`, especialmente validación con Node 26, emulación/despliegue de reglas y CSP amplia.

## Decisiones arquitectónicas

### Monolito modular

Se mantiene una sola API. Separar procesos ahora aumentaría complejidad de despliegue, consistencia y observabilidad sin beneficio probado. Los nuevos límites se crearán alrededor de casos de uso reales mediante controller/service/validator/repository/policy/integration.

### Compatibilidad de identidad

`role` y `verificationStatus` continúan como modelo operativo. La evolución será una capa compatible de contextos y capacidades, no una reescritura inmediata de usuarios.

### Consentimiento antes de expansión

El vínculo actual se conserva para no romper producción, pero se documenta como transitorio. Antes de Connect, expediente o memoria avanzada, una política granular deberá separar relación y acceso a cada categoría de datos.

### Separación de proyecciones

El futuro directorio leerá una proyección pública, nunca `users`, documentos de verificación o relaciones. Memoria privada, expediente clínico, administración y facturación serán límites distintos.

### Memoria con procedencia

Los resúmenes actuales no se migrarán automáticamente a hechos. El motor futuro almacenará candidatos con tipo, fuente, tiempo, confianza, confirmación y relaciones de contradicción.

## Cambios realizados

### Documentación de Fase 01

- `docs/AMIGOBOT_2_VISION.md`
- `docs/ARCHITECTURE.md`
- `docs/DEVELOPMENT_ROADMAP.md`
- `docs/DATA_MODEL.md`
- `docs/ACCESS_CONTROL.md`
- `docs/MEMORY_ENGINE_ANALYSIS.md`
- `docs/PHASE_01_REPORT.md`

### Compatibilidad corregida durante la inspección

- `frontend/src/pages/DashboardRouter.jsx`: se eliminó el log del perfil completo y el fallback de usuario incluye `cedula: null`, compatible con el esquema de reglas.
- `frontend/tests/securityConfiguration.test.js`: prueba de regresión para esquema y ausencia del log.

### Baseline de seguridad incluido

La Fase 01 parte de los cambios detallados en `SECURITY_AUDIT.md`: autenticación endurecida, políticas de rol/acceso, validación centralizada, rate limiting, cabeceras, reglas Firebase versionadas, integración IA acotada, dependencias actualizadas, pruebas y automatización DevSecOps.

## Archivos eliminados

Ninguno.

## Dependencias

La documentación de Fase 01 y la corrección de compatibilidad no incorporaron dependencias. El baseline previo actualizó versiones y lockfiles según la tabla de `SECURITY_AUDIT.md`, eliminó el SDK OpenAI no utilizado y añadió `helmet`/`express-rate-limit`.

## Cambios en modelos de datos

No se modificaron datos ni se ejecutaron migraciones. Se añadieron reglas versionadas y documentación del esquema. La única corrección frontend completa el objeto fallback de un paciente con `cedula: null`, que coincide con el registro normal.

Las entidades futuras descritas son propuestas; ninguna colección nueva fue creada en Firebase.

## Pruebas ejecutadas

| Comando | Resultado real |
|---|---|
| `npm test` | 20/20 backend y 18/18 frontend pasan |
| `npm --prefix backend run check` | Pasa |
| `npm run build` | Pasa con Vite 8.4.0 |
| `git diff --check` | Pasa |
| `npm run security:audit` | 0 vulnerabilidades en raíz/backend/frontend en la última ejecución |

El build conserva una advertencia no bloqueante: bundle principal de aproximadamente 1.398 MB minificado (437.7 kB gzip).

ESLint conserva cuatro errores y una advertencia preexistentes sobre efectos React. No se ocultaron ni se ampliaron los cambios para corregirlos.

## Riesgos pendientes

1. Ejecutar la matriz con Node 26.13.1/npm 11.21.3; la máquina local sigue en Node 24.14.1/npm 11.11.0.
2. Probar reglas Firestore/Storage con emulador antes de desplegarlas.
3. Introducir consentimiento granular antes de expandir el acceso profesional.
4. Separar análisis internos de documentos de conversación en una migración futura.
5. Diseñar eliminación/retención y revocación de cuenta.
6. Implementar store compartido de rate limiting si Render escala horizontalmente.
7. Reducir CSP a los hosts reales.
8. Añadir staging y pruebas E2E sin datos reales.
9. Resolver deuda de lint y división de bundle en tareas separadas.

## Limitaciones

- No se usaron Firebase, SEP u OpenAI reales durante pruebas.
- No se validaron reglas en Emulator Suite.
- No se probaron todavía los workflows remotos de GitHub Actions.
- Los documentos describen arquitectura objetivo; no afirman que módulos futuros estén implementados.

## Procedimiento de reversión

La corrección funcional de esta fase se limita a dos archivos frontend y puede revertirse por archivo. Los siete documentos pueden retirarse sin afectar runtime. Para el baseline completo, seguir el procedimiento detallado en `SECURITY_AUDIT.md` y mantener juntos cada `package.json` con su lockfile.

Antes de cualquier reversión:

```powershell
git status --short
git diff --binary > amigobot-phase-01.patch
```

No usar `git reset --hard`, no tocar credenciales y no borrar datos.

## Recomendación para la Fase 02

Comenzar por identidad/capacidades y consentimiento. Crear primero contratos, políticas puras y pruebas con adaptadores falsos; después añadir almacenamiento compatible y feature flag. No iniciar Connect ni memoria avanzada hasta que vínculo y consentimiento sean conceptos distintos en el backend.

## Estado de aceptación

- Frontend compila: sí.
- Backend pasa chequeo sintáctico: sí.
- Funciones existentes cubiertas por pruebas disponibles: sí.
- Pruebas de seguridad/autorización: sí, dentro de la cobertura local documentada.
- Regresiones críticas conocidas: ninguna detectada.
- Arquitectura documentada: sí.
- Cambios revisables y reversibles: sí.
- Riesgos pendientes explícitos: sí.

La Fase 01 queda lista para revisión humana. No se inicia la Fase 02 sin autorización explícita.
