# Flujo de verificacion profesional

La solicitud autenticada se envia a `POST /api/psychologists/verify-cedula` como `multipart/form-data`.

Campos del formulario:

- `declaredFullName`
- `cedula`
- `declaredGraduationYear`
- `declaredInstitution`
- `documentConsent`, cuyo unico valor aceptado es el texto `true`
- `idDocument`, imagen JPEG, PNG o WEBP de hasta el limite configurado

El frontend agrega `documentConsent` antes de `idDocument`. Multer espera exclusivamente el campo `idDocument`, mantiene el archivo en memoria y no lo escribe en disco ni Firestore. Si falta el consentimiento o su valor es distinto de `true`, la API responde HTTP 400 sin validar el archivo, consultar SEP, llamar a OpenAI ni modificar `verificationStatus`.

El token proporciona el `uid`; el formulario no envia `uid`, `role` ni `verificationStatus`. Solo una cuenta `psychologist` con estado `pending` puede continuar. Una cuenta de paciente recibe 403 y una cuenta profesional `approved` o `rejected` recibe 409.

Una falla tecnica conserva el estado `pending`. La IA documental no aprueba ni rechaza por si sola; un `rejected` automatico requiere una contradiccion profesional concluyente del servicio SEP.
