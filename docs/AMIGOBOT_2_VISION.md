# AmigoBot 2.0 — visión del producto

## Propósito

AmigoBot 2.0 evolucionará de una aplicación de acompañamiento entre sesiones a una plataforma modular para bienestar personal y operación profesional. Seguirá siendo una herramienta de apoyo: no diagnostica, no reemplaza atención psicológica y no toma decisiones clínicas autónomas.

La evolución será incremental. Cada dominio se habilitará mediante una fase revisable, pruebas de autorización y mecanismos de reversión. Tener una cuenta personal no exigirá estar vinculado a un profesional.

## Dominios de producto

### AmigoBot Personal

Espacio privado del usuario para conversación, preferencias y acompañamiento. Sus datos privados no se vuelven clínicos ni compartidos por el simple hecho de vincularse con un profesional.

### Memory Engine

Memoria persistente y controlable por el usuario. En el futuro distinguirá hechos, episodios, relaciones, temporalidad, procedencia y nivel de confianza. No se implementa en esta fase.

### AmigoBot Professional

Herramientas de consultorio: pacientes autorizados, tareas, citas, expedientes, notas y colaboración de personal. El acceso profesional requiere verificación y autorización contextual.

### Clinical Copilot

Asistencia para organizar información y preparar materiales para revisión humana. No diagnostica, prescribe ni ejecuta acciones clínicas sin confirmación profesional.

### AmigoBot Connect

Directorio de profesionales verificados, búsqueda y solicitudes de consulta. Será accesible a usuarios sin psicólogo vinculado y publicará únicamente datos profesionales expresamente aprobados.

### AmigoBot Business

Suscripciones, facturación y operación comercial. Los datos financieros estarán separados de conversaciones y expedientes. No se incorporan pagos en esta fase.

### AmigoBot Admin

Verificación profesional, seguridad, soporte, auditoría y operación global. Un administrador no debe consultar contenido clínico por defecto; el soporte excepcional requerirá propósito, trazabilidad y mínimo privilegio.

## Principios obligatorios

1. Privacidad por defecto y consentimiento explícito.
2. Identidad y autorización determinadas en el backend.
3. Separación entre perfil personal, memoria, datos compartidos y expediente clínico.
4. La vinculación no equivale a consentimiento para compartir conversaciones.
5. IA sin autoridad para conceder permisos o ejecutar decisiones clínicas.
6. Cambios pequeños, versionados, observables y reversibles.
7. Compatibilidad con usuarios y flujos existentes.
8. Denegación por defecto y acceso por propósito.
9. Trazabilidad sin almacenar contenido sensible innecesario.
10. La estabilidad del producto existente tiene prioridad sobre refactorizaciones estéticas.

## Qué no forma parte de la Fase 01

- Interfaces nuevas o rediseño visual.
- Directorio público, reservas o pagos.
- Expediente clínico completo.
- Motor de memoria semántica.
- Herramientas autónomas para IA.
- Multi-clínica o personal de clínica operativo.
- Migraciones de datos de producción.

## Criterio de evolución

Cada capacidad futura debe declarar propietario del dato, audiencia, finalidad, retención, consentimiento, revocación, eventos auditables y ruta de eliminación antes de almacenar información. Si no puede responder esas preguntas, no debe entrar a producción.
