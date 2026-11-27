import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const testDirectory = fileURLToPath(new URL(".", import.meta.url));
const frontendDirectory = resolve(testDirectory, "..");
const projectDirectory = resolve(frontendDirectory, "..");

test("el service worker no almacena API, POST ni datos de autenticación", () => {
  const source = readFileSync(
    resolve(frontendDirectory, "public", "sw.js"),
    "utf8"
  );

  assert.match(source, /request\.method !== "GET"/);
  assert.match(source, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.match(source, /\["image", "manifest"\]\.includes\(request\.destination\)/);
  assert.doesNotMatch(source, /Authorization|chatMessages|conversations/);
});

test("las reglas de Firebase niegan por defecto y Storage no acepta archivos", () => {
  const firestoreRules = readFileSync(
    resolve(projectDirectory, "firestore.rules"),
    "utf8"
  );
  const storageRules = readFileSync(
    resolve(projectDirectory, "storage.rules"),
    "utf8"
  );

  assert.match(firestoreRules, /allow get: if ownsDocument\(userId\)/);
  assert.match(firestoreRules, /data\.keys\(\)\.hasAll/);
  assert.match(firestoreRules, /data\.createdAt == request\.time/);
  assert.match(firestoreRules, /data\.role == 'patient' && data\.cedula == null/);
  assert.match(firestoreRules, /allow update, delete: if false/);
  assert.match(firestoreRules, /match \/\{document=\*\*\}[\s\S]*allow read, write: if false/);
  assert.match(storageRules, /allow read, write: if false/);
});

test("Vercel publica las cabeceras defensivas principales", () => {
  const configuration = JSON.parse(
    readFileSync(resolve(frontendDirectory, "vercel.json"), "utf8")
  );
  const keys = new Set(configuration.headers[0].headers.map(({ key }) => key));

  for (const required of [
    "Content-Security-Policy",
    "Permissions-Policy",
    "Referrer-Policy",
    "Strict-Transport-Security",
    "X-Content-Type-Options",
    "X-Frame-Options",
  ]) {
    assert.equal(keys.has(required), true, `Falta ${required}`);
  }
});

test("el fallback de perfil respeta el esquema y no registra datos personales", () => {
  const source = readFileSync(
    resolve(frontendDirectory, "src", "pages", "DashboardRouter.jsx"),
    "utf8"
  );

  assert.match(source, /role: "patient",\s+cedula: null,/);
  assert.doesNotMatch(source, /console\.log\([^)]*userData/);
});
