# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Registro profesional

El registro de pacientes no muestra ni requiere datos profesionales. Para psicologos, el frontend envia la solicitud de verificacion como `multipart/form-data`; el archivo usa el campo `idDocument` y el consentimiento explicito usa `documentConsent=true`. El navegador genera el encabezado `Content-Type` con su boundary, por lo que el codigo no lo establece manualmente.

El documento se procesa temporalmente en memoria en el backend y no se persiste. El formulario aclara que no existe reconocimiento facial. Si el consentimiento falta o no es exactamente `true`, la API responde 400 antes de validar el archivo o consultar SEP/IA y la cuenta permanece `pending`.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
