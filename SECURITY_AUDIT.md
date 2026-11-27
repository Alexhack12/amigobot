# Auditoría de seguridad, modernización y estabilidad de AmigoBot

Fecha de corte: 26 de noviembre de 2026

Rama revisada: `main`

Estado de auditoría: baseline validado localmente; la publicación posterior se documenta en `docs/PHASE_01_REPORT.md`

## 1. Alcance y método

Se revisaron el frontend React/Vite, la PWA, el backend Express, Firebase Authentication, Firebase Admin, los accesos a Firestore, el servicio de cédulas, la integración de IA, los tres árboles de dependencias y la configuración de despliegue versionada. La revisión tomó como referencia OWASP Top 10 y OWASP API Security Top 10, con atención especial a BOLA/IDOR, control de acceso, inyección, exposición de datos, abuso de recursos, configuración insegura y cadena de suministro.

Las comprobaciones se realizaron localmente con pruebas unitarias, mocks y análisis estático. No se llamó a Firebase, SEP ni OpenAI reales; no se modificaron datos reales; no se desplegaron reglas ni aplicaciones.

Fuentes primarias consultadas:

- [Node.js: versión 26.13.1 LTS](https://nodejs.org/en/blog/release) y [boletín de seguridad de noviembre de 2026](https://nodejs.org/en/blog/vulnerability/november-2026-security-releases/).
- [Notas oficiales de Firebase Admin Node.js](https://firebase.google.com/support/release-notes/admin/node) y [versiones actuales de Firebase](https://firebase.google.com/support/releases).
- [Avisos oficiales de Vite](https://github.com/vitejs/vite/security/advisories), [body-parser](https://github.com/expressjs/body-parser/security/advisories) y [CodeQL](https://github.com/github/codeql-action).
- [OWASP API Security Top 10](https://owasp.org/API-Security/editions/2023/en/0x11-t10/).
- [Configuración oficial de Dependabot](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/configure-version-updates).

## 2. Estado inicial

La aplicación ya funcionaba y estaba desplegada, pero el repositorio no incluía reglas de Firestore o Storage, controles automatizados de seguridad ni una versión reproducible de Node/npm. El frontend combinaba Firebase Authentication con lecturas/escrituras directas a Firestore. El backend contenía comprobaciones de rol, pero varias decisiones de autorización dependían de datos almacenados sin proteger suficientemente la identidad canónica del token.

Hallazgos iniciales de dependencias:

- Frontend: 19 vulnerabilidades (`1 critical`, `12 high`, `6 moderate`).
- Árbol backend/raíz auditado: 20 vulnerabilidades (`2 critical`, `5 high`, `12 moderate`, `1 low`).
- Se identificaron, entre otros, avisos sobre Vite, React Router, `proxy-addr`, `body-parser`, gRPC, `websocket-driver` y dependencias transitivas de Firebase.

El runtime local era Node.js `24.14.1` y npm `11.11.0`. Node 24.14.1 precede al parche 24.22.3 del boletín de noviembre de 2026. Entre las vulnerabilidades corregidas por ese boletín están `CVE-2026-123863`, `CVE-2026-123864` y `CVE-2026-123865`. El proyecto se fijó en Node 26.13.1 LTS, pero ese runtime todavía debe instalarse en la máquina y configurarse en Render.

## 3. Arquitectura observada

### Frontend

- React + Vite + React Router.
- Firebase Authentication y observación en tiempo real del documento propio del usuario.
- API REST autenticada con `Authorization: Bearer <Firebase ID token>`.
- PWA con service worker propio.
- Vercel sirve el frontend y aplica el rewrite de SPA.

### Backend

- Node.js + Express.
- Firebase Admin para verificar tokens y acceder a Firestore.
- Rutas `/api/users`, `/api/admin`, `/api/psychologists` y `/api/chat`.
- Consulta del registro profesional de SEP por HTTPS.
- Integración de IA mediante `fetch`; el paquete `openai` estaba instalado pero no se utilizaba.

### Datos

Colecciones observadas: `users`, `invitationCodes`, `psychologistPatients`, `conversations`, `chatMessages`, `behavioralReports` y `patientTasks`. Los análisis conductuales siguen siendo información interna; los reportes nuevos mantienen `visibleToPatient: false`.

## 4. Inventario de versiones

| Tecnología | Antes | Nueva versión declarada | Observación |
|---|---:|---:|---|
| Node.js | 24.14.1 local | 26.13.1 LTS | Requiere instalación/configuración manual |
| npm | 11.11.0 local | 11.21.3 | Requiere actualización manual |
| React / React DOM | 19.2.6 | 19.3.1 | Build correcto |
| Vite | 8.0.12 | 8.4.0 | Corrige avisos del servidor de desarrollo |
| Express | 5.2.1 | 5.3.0 | Build y sintaxis correctos |
| Firebase Web SDK | 12.13.0 | 13.4.0 | Build correcto |
| Firebase Admin | 13.10.0 | 14.5.1 | Migrado a API modular |
| React Router DOM | 7.15.1 | 7.18.7 | Pruebas y build correctos |
| Framer Motion | 12.40.0 | 12.43.0 | Build correcto |
| Lucide React | 1.16.0 | 1.81.0 | Build correcto |
| ESLint | 10.3.0 | 10.15.0 | Conserva deuda preexistente documentada |
| OpenAI SDK | 6.39/6.42 | Eliminado | No se usaba; la integración usa `fetch` |
| Nodemon | 3.1.14 | 3.1.11 exacta | Versión reproducible con auditoría limpia |

Se fijaron versiones exactas, `engines`, `packageManager`, `.nvmrc`, `.node-version` y `.npmrc`. Los tres lockfiles fueron regenerados sin ejecutar scripts de ciclo de vida. Los overrides transitivos se limitaron a versiones comprobadas por `npm audit`.

## 5. Vulnerabilidades y correcciones

| Severidad | Hallazgo | Riesgo / referencia | Corrección y archivos principales |
|---|---|---|---|
| Crítica | El documento de Firestore podía sobrescribir el `uid` procedente del token por el orden del spread | Suplantación de identidad, BOLA; OWASP API1/API5 | Identidad canónica solo desde el token, verificación con revocación y fallo cerrado. `backend/services/authenticationService.js`, `backend/middleware/authMiddleware.js` |
| Crítica | Dependencias con avisos activos | Cadena de suministro. Incluía `GHSA-jqcg-44mw-7w3h`/`CVE-2026-90711`, `GHSA-27r3-jxmh-p828`/`CVE-2026-111181`, `GHSA-p4f5-76q4-ffq7` y avisos de Vite/React Router | Actualización controlada, paquetes exactos, lockfiles, auditoría automática y Dependabot |
| Alta | No existían reglas versionadas de Firestore/Storage | Lectura o escritura directa no controlada si las reglas remotas fueran permisivas | `firestore.rules` con denegación por defecto y creación propia acotada; `storage.rules` niega todo; `firebase.json` |
| Alta | `/users/sync` podía alterar atributos sensibles o reactivar cuentas | Escalamiento de privilegios y evasión de bloqueo | Resincronización de cuentas existentes solo cambia nombre/correo; conserva rol, estado y bloqueo. Transacción y pruebas negativas |
| Alta | Verificación profesional podía cambiar el rol y tenía comportamiento inseguro ante caída externa | Conversión paciente→psicólogo y aprobación ficticia | Solo acepta cuentas ya registradas como psicólogo; nunca cambia `role`; falla externa produce `pending`; mock imposible en producción |
| Alta | SEP se consultaba sin una política robusta de transporte/fallo | Manipulación o disponibilidad externa | HTTPS, timeout, campos mínimos, cédula exacta y contradicciones concluyentes; sin registros completos en logs |
| Alta | Acceso profesional a paciente insuficientemente centralizado | BOLA/IDOR entre psicólogos y pacientes | Servicio de control de acceso exige vínculo exacto y activo antes de reportes, conversaciones, tareas, resumen o bloqueo |
| Alta | Código de invitación predecible, sin expiración y consumible con carrera de concurrencia | Vinculación no autorizada/reutilización | `crypto.randomBytes`, expiración de 24 horas y consumo atómico en transacción |
| Alta | Sin rate limiting ni límite explícito de JSON | Fuerza bruta, abuso de IA y DoS | Límite global 300/15 min, chat 30/min, JSON estricto de 32 KiB, Express detrás de un proxy confiable |
| Alta | Respuestas de chat podían exponer etiquetas internas al paciente | Privacidad clínica | Serializadores de lista, historial y respuesta solo devuelven campos públicos; pruebas aseguran ausencia de riesgo, resumen y recomendaciones |
| Alta | Firebase Admin 14 era incompatible con el inicializador anterior | Caída total del backend al arrancar | Migración a `firebase-admin/app`, `/auth` y `/firestore`; fachada mínima únicamente para `FieldValue` |
| Media | Roles confiaban parcialmente en UI y rutas repetían decisiones | Autorización inconsistente | Guards centrales para admin y psicólogo aprobado; AdminDashboard usa API protegida en vez de Firestore directo |
| Media | Entradas con tipos ambiguos, identificadores sin límite y `Boolean("false")` | Manipulación de parámetros y acceso inesperado | Validadores estrictos para objetos, texto, booleanos, ids, códigos, tareas y mensajes |
| Media | CORS incluía localhost en cualquier ambiente y habilitaba credenciales | Configuración insegura | En producción solo `FRONTEND_URL`; localhost solo desarrollo; `credentials: false` para tokens Bearer |
| Media | Faltaban encabezados defensivos | Clickjacking, sniffing y reducción insuficiente de superficie XSS | Helmet en API; CSP, HSTS, COOP, Permissions Policy, referrer policy, `nosniff` y `DENY` en Vercel |
| Media | IA sin timeout suficiente, con demasiado contexto y reglas débiles frente a prompt injection | Abuso, fuga cruzada o consumo excesivo | Timeout, mensajes/contexto acotados, delimitación de datos no confiables, instrucción explícita contra exfiltración o acciones privilegiadas |
| Media | Errores y conversaciones podían registrarse con demasiado detalle | Exposición de información sensible | Se eliminaron logs de mensajes completos y respuestas externas; errores globales registran solo nombre y ruta |
| Media | Service account local podía ser fallback en producción | Credencial incorrecta o secreta en runtime | Producción exige `FIREBASE_SERVICE_ACCOUNT`; validación mínima de sus campos; archivo local solo desarrollo |
| Baja | `X-Powered-By`, 404 HTML y errores variables | Fingerprinting y respuestas inconsistentes | Cabecera deshabilitada, 404/error JSON y mensajes genéricos |

Avisos representativos del frontend inicial: `GHSA-jjmj-jmhj-qwj2` (`CVE-2026-53668`) y `GHSA-qwww-vcr4-c8h2` en React Router; `GHSA-rq7h-c2jc-7f22`, `GHSA-9jrq-w75r-8gcw` y `GHSA-p9ff-h696-f583` en Vite. La fuente autoritativa del estado final es la ejecución actual de `npm audit`: cero vulnerabilidades en los tres árboles.

## 6. Autenticación y autorización

- El backend exige un Bearer token con formato exacto y llama `verifyIdToken(token, true)`, por lo que comprueba tokens revocados.
- El `uid` y el correo canónicos proceden del token; un campo malicioso del documento no puede sustituir el `uid`.
- Un perfil inexistente o una lectura fallida no obtiene acceso. Las cuentas bloqueadas se rechazan centralmente.
- Los privilegios de administrador y psicólogo aprobado se verifican en el backend.
- Un psicólogo solo accede a un paciente con un vínculo exacto y activo.
- El endpoint de verificación de cédula nunca cambia roles y solo opera sobre un psicólogo existente.
- La creación directa de un documento propio desde registro queda limitada por reglas a `patient` o `psychologist`; no permite `admin`, bloqueo, aprobación profesional ni actualización posterior.
- CSRF no usa cookies de sesión: la API recibe tokens Bearer y CORS no admite credenciales. Si en el futuro se introducen cookies, deberá añadirse protección CSRF específica.

No se encontró flujo backend de eliminación de cuenta. Antes de implementarlo se recomienda una operación administrativa autenticada que revoque refresh tokens, elimine o anonimice datos relacionados con una política de retención documentada y deje un evento de auditoría sin contenido clínico.

## 7. Firebase y privacidad

Las nuevas reglas aplican denegación por defecto. El cliente solo puede leer su documento propio y crear inicialmente un perfil con campos y estados limitados. Conversaciones, reportes, mensajes, vínculos, invitaciones, tareas y demás colecciones quedan accesibles únicamente mediante Firebase Admin en el backend, donde se aplican los guards.

Storage queda completamente cerrado porque el flujo actual no necesita carga persistente. No hay un endpoint activo de documentos en esta rama; si se incorpora posteriormente, deberá añadirse un bucket/ubicación separados, validación binaria, TTL, antivirus y reglas específicas antes de abrir Storage.

La configuración del SDK web de Firebase es pública por diseño y puede aparecer en el bundle. No se encontraron claves privadas, tokens OpenAI, archivos `.env` rastreados ni `serviceAccountKey.json` rastreado. El `.gitignore` excluye esos archivos sensibles.

Importante: las reglas fueron creadas y revisadas estáticamente, pero no se desplegaron ni se ejecutaron en el emulador de Firebase. No deben considerarse activas hasta una revisión manual y despliegue autorizado.

## 8. Seguridad de IA

- La clave solo se obtiene desde `OPENAI_API_KEY` del servidor.
- Los mensajes se limitan a 4,000 caracteres; el contexto reciente y la memoria se recortan antes del envío.
- Historial, memoria y mensaje se tratan explícitamente como contenido no confiable dentro del prompt.
- Las instrucciones del usuario no pueden autorizar acceso a otros usuarios ni ejecutar funciones privilegiadas: el modelo no dispone de herramientas de backend y la autorización ocurre antes de preparar el contexto.
- Las consultas de mensajes y memoria están ligadas al `uid` autenticado.
- No se registran conversaciones completas ni el cuerpo de error del proveedor.
- La respuesta al paciente no incluye `riskLevel`, `summary`, `recommendations` ni otras etiquetas internas.
- El producto conserva lenguaje de acompañamiento y evita presentarse como diagnóstico clínico.

Riesgo residual: un prompt nunca garantiza por sí solo resistencia total a prompt injection. Debe mantenerse la separación actual entre generación de texto y acciones privilegiadas. Cualquier futura herramienta de IA requerirá autorización determinista fuera del modelo, allowlists de acciones y confirmación humana.

## 9. Frontend y PWA

- No se encontraron usos de `dangerouslySetInnerHTML`, `eval` o `new Function`.
- `localStorage` contiene únicamente preferencias de interfaz; `sessionStorage`, un aviso efímero de bloqueo. No se almacenan conversaciones ni expedientes allí.
- El service worker ignora métodos distintos de GET, otros orígenes y `/api/`; solo cachea el shell estático y recursos cuyo destino es `image` o `manifest`.
- Se añadieron pruebas para impedir regresiones del service worker, reglas Firebase y cabeceras.
- La CSP inicial es compatible pero `connect-src 'self' https: wss:` sigue siendo más amplia de lo ideal. Debe cerrarse a los dominios exactos de Render/Firebase después de confirmar los hosts reales.

## 10. Automatización DevSecOps

Se añadieron:

- `.github/dependabot.yml`: revisiones semanales para npm en raíz/backend/frontend y para GitHub Actions.
- `.github/workflows/security.yml`: instalación reproducible sin lifecycle scripts, pruebas, sintaxis, build y `npm audit` en PR/push.
- `.github/workflows/codeql.yml`: CodeQL JavaScript/TypeScript con consultas `security-extended`, semanal y en PR/push.

Las acciones usan las ramas mayores recomendadas actualmente (`actions/checkout@v7`, `actions/setup-node@v7`, `github/codeql-action@v4`), y Dependabot mantiene esas referencias. Su ejecución remota debe comprobarse después de publicar el commit; no forma parte de las pruebas locales de esta auditoría.

## 11. Archivos modificados o añadidos

### Entorno y dependencias

- `package.json`, `package-lock.json`
- `backend/package.json`, `backend/package-lock.json`
- `frontend/package.json`, `frontend/package-lock.json`
- `.nvmrc`, `.node-version`, `.npmrc`
- `backend/.env.example`

### Backend

- `backend/server.js`
- `backend/firebase/firebaseAdmin.js`
- `backend/middleware/authMiddleware.js`
- `backend/routes/adminRoutes.js`
- `backend/routes/chatRoutes.js`
- `backend/routes/psychologistRoutes.js`
- `backend/routes/userRoutes.js`
- `backend/services/aiService.js`
- `backend/services/cedulaService.js`
- Nuevos servicios: `accessControlService.js`, `authenticationService.js`, `patientResponseService.js`, `roleAuthorization.js`, `securityValidation.js`, `userSyncService.js`
- `backend/scripts/checkSyntax.js`
- Pruebas nuevas bajo `backend/tests/`

### Frontend y plataforma

- `frontend/src/pages/AdminDashboard.jsx`
- `frontend/src/services/api.js`
- `frontend/src/services/services.js`
- `frontend/vercel.json`
- `frontend/tests/securityConfiguration.test.js`
- `firebase.json`, `firestore.rules`, `storage.rules`
- `.github/dependabot.yml`, `.github/workflows/security.yml`, `.github/workflows/codeql.yml`

## 12. Resultados de validación

| Comprobación | Resultado |
|---|---|
| Backend `node --test` | 20/20 pasan |
| Frontend `node --test` | 17/17 pasan |
| Chequeo sintáctico backend | Pasa; script portable en Windows/Linux |
| `npm run build` | Pasa con Vite 8.4.0 |
| `npm audit` raíz | 0 vulnerabilidades |
| `npm audit` backend | 0 vulnerabilidades |
| `npm audit` frontend | 0 vulnerabilidades |
| `git diff --check` | Pasa |
| Búsqueda de secretos | Sin claves privadas, tokens OpenAI ni credenciales rastreadas |
| ESLint frontend | 4 errores + 1 warning preexistentes; no ocultados |

Las pruebas negativas cubren identidad canónica del token, cuenta bloqueada, perfil inexistente, error de base de datos, roles incompatibles, psicólogo pendiente, BOLA de pacientes, ids manipulados, tipos ambiguos, caída de SEP, mock deshabilitado en producción, privacidad de respuestas del paciente, inmutabilidad de rol/estado en sincronización, API modular de Firebase Admin, service worker, reglas y cabeceras.

El build advierte que el bundle principal minificado mide aproximadamente 1.398 MB (437.7 kB gzip), por encima del umbral de 500 kB sin comprimir. No bloquea seguridad ni estabilidad, pero conviene dividir carga con imports dinámicos en una tarea separada.

## 13. Riesgos pendientes y limitaciones

1. **Node/npm del equipo y Render:** los archivos exigen Node 26.13.1/npm 11.21.3, pero las pruebas locales se ejecutaron con Node 24.14.1/npm 11.11.0. Debe repetirse toda la matriz con el runtime objetivo antes de desplegar.
2. **Firebase Rules:** no se probaron con Firebase Emulator Suite ni se desplegaron. Requieren pruebas de reglas con usuarios patient/psychologist/admin y autorización explícita de despliegue.
3. **Lint:** permanecen cuatro errores `react-hooks/set-state-in-effect` en `AdminDashboard.jsx`, `Home.jsx`, `PatientDashboard.jsx` y `PsychologistDashboard.jsx`, más una dependencia faltante en un efecto. Son deuda preexistente y se dejaron visibles para evitar ampliar el alcance.
4. **CSP:** `connect-src` debe reducirse a dominios exactos cuando se confirme la URL final de Render y los endpoints Firebase utilizados.
5. **Observabilidad:** no existe una plataforma versionada de alertas, retención o auditoría. Deben registrarse eventos de seguridad mínimos, nunca conversaciones completas.
6. **Cuentas y retención:** falta un flujo controlado de eliminación, revocación masiva y política de conservación/anominización de información clínica.
7. **Pruebas de integración:** no se levantaron emuladores ni servicios externos. Las pruebas unitarias cubren las decisiones críticas, pero antes de producción se requiere un entorno staging aislado.
8. **Rate limiting:** el almacenamiento por memoria sirve para una sola instancia; con múltiples instancias de Render se recomienda Redis u otro store compartido.
9. **Códigos de invitación:** la expiración y consumo son atómicos, pero conviene añadir limpieza programada de documentos vencidos mediante TTL de Firestore.

## 14. Intervención manual recomendada

1. Instalar Node.js 26.13.1 LTS y npm 11.21.3; ejecutar `npm ci --ignore-scripts` en los tres árboles y repetir pruebas/build/auditoría.
2. Configurar de forma explícita el runtime de Render; no depender del valor predeterminado de la plataforma.
3. Revisar `FRONTEND_URL`, `FIREBASE_SERVICE_ACCOUNT`, `OPENAI_API_KEY` y timeouts en los secretos de la plataforma sin copiar valores al repositorio.
4. Ejecutar Firebase Emulator Suite con casos permitidos/denegados y, tras aprobación, desplegar `firestore.rules` y `storage.rules`.
5. Confirmar los dominios de conexión del frontend y endurecer CSP.
6. Activar protección de ramas para exigir los workflows de seguridad y revisión humana de Dependabot.
7. Verificar en staging login, registro de ambos roles, bloqueo/desbloqueo, invitaciones, chat, reportes y navegación PWA.

## 15. Procedimiento de reversión

No hay commit ni despliegue, por lo que la reversión es local y por archivo. Antes de revertir, conservar evidencia con:

```powershell
git diff --binary > amigobot-security-audit.patch
git status --short
```

Después se puede restaurar un archivo concreto con `git restore -- <ruta>` y retirar únicamente los archivos nuevos listados en este documento. No debe usarse `git reset --hard`, ni eliminar directorios completos, ni tocar `.env`, credenciales o datos. Para una reversión parcial segura se recomienda comenzar por dependencias + lockfile del mismo árbol como una unidad, y luego el código que depende de esas versiones.

Si el commit ya fue publicado, la reversión remota debe hacerse con un commit `git revert` y con el rollback propio de Vercel/Render; no se debe reescribir `main`. Firebase Rules mantiene un ciclo independiente y solo requiere rollback si fue desplegado expresamente.

## 16. Preparación para personalización de perfiles

No se implementó la nueva personalización. La arquitectura quedó mejor preparada mediante servicios pequeños y comprobables para autenticación, autorización, acceso a pacientes, validación y serialización pública. La futura funcionalidad debe añadirse como un módulo separado con:

- esquema explícito y lista permitida de campos;
- endpoint backend autenticado;
- campos de preferencia separados de roles, bloqueos y verificación;
- límites de tamaño y valores;
- reglas de visibilidad por rol;
- ninguna inclusión automática en prompts de IA;
- migración reversible y pruebas de aislamiento entre usuarios.

## 17. Conclusión

El código local queda significativamente endurecido y con dependencias auditadas en cero vulnerabilidades conocidas al corte indicado. Las correcciones críticas de identidad, rol, BOLA, invitaciones, privacidad del chat, abuso de API y compatibilidad Firebase Admin están verificadas mediante pruebas locales. No se considera listo para despliegue hasta completar las intervenciones manuales: ejecutar con Node 26.13.1, probar y desplegar reglas Firebase en entorno controlado, validar staging y resolver o aceptar formalmente la deuda de lint/CSP.
