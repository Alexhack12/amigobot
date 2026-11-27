const test = require("node:test");
const assert = require("node:assert/strict");
const {
  ValidationError,
  generateInviteCode,
  requireBoolean,
  requireDocumentId,
  requirePlainObject,
  requireString,
} = require("../services/securityValidation");

test("acepta valores válidos y normaliza texto", () => {
  assert.equal(requireString("  mensaje  ", "Mensaje", { maxLength: 20 }), "mensaje");
  assert.equal(requireDocumentId("abc_DEF-123"), "abc_DEF-123");
  assert.equal(requireBoolean(false, "blocked"), false);
});

test("rechaza tipos ambiguos, ids manipulados y cuerpos no planos", () => {
  assert.throws(() => requireBoolean("false", "blocked"), ValidationError);
  assert.throws(() => requireDocumentId("../otro-usuario"), ValidationError);
  assert.throws(() => requireString("x".repeat(501), "Mensaje"), ValidationError);
  assert.throws(() => requirePlainObject([]), ValidationError);
});

test("genera códigos criptográficos con formato estable", () => {
  const first = generateInviteCode();
  const second = generateInviteCode();

  assert.match(first, /^[A-Z0-9_-]{12}$/);
  assert.match(second, /^[A-Z0-9_-]{12}$/);
  assert.notEqual(first, second);
});
