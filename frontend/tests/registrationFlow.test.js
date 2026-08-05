import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  buildPsychologistVerificationFormData,
  buildRegistrationUserData,
  completePsychologistVerification,
  isPsychologistRegistration,
  REGISTRATION_DASHBOARD_PATH,
} from "../src/utils/registrationFlow.js";

const registerSource = readFileSync(
  fileURLToPath(new URL("../src/pages/Register.jsx", import.meta.url)),
  "utf8"
);
const apiSource = readFileSync(
  fileURLToPath(new URL("../src/services/api.js", import.meta.url)),
  "utf8"
);
const serviceWorkerSource = readFileSync(
  fileURLToPath(new URL("../public/sw.js", import.meta.url)),
  "utf8"
);

test("registro de paciente no muestra ni exige campos profesionales", () => {
  assert.equal(isPsychologistRegistration("patient"), false);

  const userData = buildRegistrationUserData({
    uid: "patient-test",
    name: "Paciente Prueba",
    email: "patient@example.invalid",
    role: "patient",
    cedula: "",
    graduationYear: "",
    institution: "",
    createdAt: "mock-timestamp",
  });

  assert.equal(userData.role, "patient");
  assert.equal(userData.verificationStatus, "approved");
  assert.equal(userData.cedula, null);
  assert.equal(userData.declaredFullName, undefined);
  assert.equal(userData.declaredGraduationYear, undefined);
  assert.equal(userData.declaredInstitution, undefined);
});

test("fallo del endpoint después de crear cuenta conserva pending y permite continuar", async () => {
  const userData = buildRegistrationUserData({
    uid: "psychologist-test",
    name: "Psicóloga Prueba",
    email: "psychologist@example.invalid",
    role: "psychologist",
    cedula: "12345678",
    graduationYear: "2020",
    institution: "Universidad de Prueba",
    createdAt: "mock-timestamp",
  });
  const message = await completePsychologistVerification(
    async () => {
      throw new Error("mock endpoint failure");
    },
    {}
  );

  assert.equal(userData.verificationStatus, "pending");
  assert.equal(message, "Verificación pendiente de revisión");
  assert.equal(REGISTRATION_DASHBOARD_PATH, "/dashboard");
});

test("registro profesional construye multipart con idDocument y consentimiento", () => {
  const idDocument = new Blob(["DOCUMENTO FICTICIO PARA PRUEBAS - SIN VALIDEZ"], {
    type: "image/jpeg",
  });
  const formData = buildPsychologistVerificationFormData({
    declaredFullName: "PERSONA FICTICIA",
    cedula: "12345678",
    declaredGraduationYear: "2020",
    declaredInstitution: "UNIVERSIDAD FICTICIA",
    documentConsent: true,
    idDocument,
  });

  assert.equal(formData instanceof FormData, true);
  assert.equal(formData.get("documentConsent"), "true");
  assert.equal(formData.get("idDocument").type, "image/jpeg");
  assert.equal(formData.get("ineImage"), null);
  assert.equal(formData.get("uid"), null);
  assert.equal(formData.get("role"), null);
  assert.equal(formData.get("verificationStatus"), null);
});

test("consentimiento no marcado se representa como false", () => {
  const formData = buildPsychologistVerificationFormData({
    declaredFullName: "PERSONA FICTICIA",
    cedula: "12345678",
    declaredGraduationYear: "2020",
    declaredInstitution: "UNIVERSIDAD FICTICIA",
    documentConsent: false,
    idDocument: new Blob(["ficticio"], { type: "image/png" }),
  });

  assert.equal(formData.get("documentConsent"), "false");
});

test("campos de registro tienen name y autocomplete correctos", () => {
  const expectedAttributes = [
    [/name="name"[\s\S]*?autoComplete="name"/, "nombre"],
    [/name="email"[\s\S]*?autoComplete="email"/, "correo"],
    [/name="cedula"[\s\S]*?autoComplete="off"/, "cedula"],
    [/name="declaredGraduationYear"[\s\S]*?autoComplete="off"/, "anio"],
    [/name="declaredInstitution"[\s\S]*?autoComplete="organization"/, "institucion"],
    [/name="idDocument"[\s\S]*?autoComplete="off"/, "archivo"],
    [/name="documentConsent"[\s\S]*?autoComplete="off"/, "consentimiento"],
    [/name="password"[\s\S]*?autoComplete="new-password"/, "contrasena"],
    [/name="confirmPassword"[\s\S]*?autoComplete="new-password"/, "confirmacion"],
  ];

  for (const [pattern, field] of expectedAttributes) {
    assert.match(registerSource, pattern, `faltan atributos correctos en ${field}`);
  }
});

test("campos profesionales y checkbox solo se renderizan para psicologos", () => {
  assert.match(registerSource, /\{isPsychologist && \([\s\S]*name="cedula"/);
  assert.match(registerSource, /\{isPsychologist && \([\s\S]*name="documentConsent"/);
  assert.match(registerSource, /useState\(false\)[\s\S]*documentConsent/);
  assert.match(registerSource, /if \(!documentConsent\)[\s\S]*return;/);
});

test("API envia FormData sin fijar Content-Type manualmente", () => {
  const verificationFunction = apiSource.match(
    /export const verifyPsychologist[\s\S]*?\n\};/
  )?.[0] || "";

  assert.match(verificationFunction, /buildPsychologistVerificationFormData/);
  assert.match(verificationFunction, /body: formData/);
  assert.doesNotMatch(verificationFunction, /Content-Type/);
});

test("service worker no intercepta POST ni rutas /api/", () => {
  assert.match(serviceWorkerSource, /request\.method !== "GET"/);
  assert.match(serviceWorkerSource, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.doesNotMatch(serviceWorkerSource, /formData\s*\(/i);
});
