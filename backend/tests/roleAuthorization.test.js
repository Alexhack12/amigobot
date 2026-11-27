const test = require("node:test");
const assert = require("node:assert/strict");
const { createRoleGuard } = require("../services/roleAuthorization");

const runGuard = (guard, user) => {
  const req = { user };
  const res = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  let nextCount = 0;
  guard(req, res, () => {
    nextCount += 1;
  });
  return { res, nextCount };
};

test("un paciente no puede ejecutar funciones administrativas", () => {
  const guard = createRoleGuard({ role: "admin", message: "Solo admin" });
  const result = runGuard(guard, { role: "patient" });

  assert.equal(result.res.statusCode, 403);
  assert.equal(result.nextCount, 0);
});

test("un psicólogo pendiente no obtiene privilegios profesionales", () => {
  const guard = createRoleGuard({
    role: "psychologist",
    verificationStatus: "approved",
    message: "Solo profesionales aprobados",
  });

  assert.equal(
    runGuard(guard, {
      role: "psychologist",
      verificationStatus: "pending",
    }).res.statusCode,
    403
  );
  assert.equal(
    runGuard(guard, {
      role: "psychologist",
      verificationStatus: "approved",
    }).nextCount,
    1
  );
});
