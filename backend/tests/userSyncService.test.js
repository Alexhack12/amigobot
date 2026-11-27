const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildExistingUserSync,
  buildNewUserProfile,
} = require("../services/userSyncService");

test("la resincronización conserva rol, verificación y bloqueo existentes", () => {
  const timestamp = { server: true };
  const { update, response } = buildExistingUserSync({
    existing: {
      email: "anterior@example.test",
      role: "patient",
      verificationStatus: "approved",
      blocked: true,
    },
    name: "Nombre actualizado",
    tokenEmail: "token@example.test",
    timestamp,
  });

  assert.deepEqual(Object.keys(update).sort(), ["email", "name", "updatedAt"]);
  assert.equal(response.role, "patient");
  assert.equal(response.verificationStatus, "approved");
  assert.equal(response.blocked, true);
});

test("un psicólogo nuevo inicia pendiente y un paciente aprobado", () => {
  const common = {
    uid: "uid-1",
    tokenEmail: "persona@example.test",
    name: "Persona",
    cedula: null,
    timestamp: { server: true },
  };

  assert.equal(
    buildNewUserProfile({ ...common, requestedRole: "psychologist" })
      .verificationStatus,
    "pending"
  );
  assert.equal(
    buildNewUserProfile({ ...common, requestedRole: "patient" })
      .verificationStatus,
    "approved"
  );
});
