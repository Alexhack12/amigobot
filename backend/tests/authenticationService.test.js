const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createAuthenticationMiddleware,
  getBearerToken,
} = require("../services/authenticationService");

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const createDb = (userData, exists = true, error = null) => ({
  collection: () => ({
    doc: () => ({
      get: async () => {
        if (error) throw error;
        return { exists, data: () => userData };
      },
    }),
  }),
});

const runMiddleware = async ({ decoded, userData, exists = true, dbError }) => {
  const auth = {
    verifyIdToken: async (token, checkRevoked) => {
      assert.equal(token, "valid-token");
      assert.equal(checkRevoked, true);
      return decoded;
    },
  };
  const { verifyToken } = createAuthenticationMiddleware({
    auth,
    db: createDb(userData, exists, dbError),
    logger: { warn() {}, error() {} },
  });
  const req = { headers: { authorization: "Bearer valid-token" } };
  const res = createResponse();
  let nextCount = 0;

  await verifyToken(req, res, () => {
    nextCount += 1;
  });

  return { req, res, nextCount };
};

test("extrae únicamente un Bearer token bien formado", () => {
  assert.equal(getBearerToken("Bearer abc.def"), "abc.def");
  assert.equal(getBearerToken("bearer abc"), null);
  assert.equal(getBearerToken("Bearer abc extra"), null);
  assert.equal(getBearerToken(undefined), null);
});

test("el uid del token prevalece sobre cualquier uid almacenado", async () => {
  const { req, nextCount } = await runMiddleware({
    decoded: { uid: "token-uid", email: "token@example.test" },
    userData: {
      uid: "manipulated-uid",
      email: "stored@example.test",
      role: "patient",
      blocked: false,
    },
  });

  assert.equal(nextCount, 1);
  assert.equal(req.user.uid, "token-uid");
  assert.equal(req.user.email, "token@example.test");
});

test("rechaza cuentas bloqueadas antes de ejecutar la ruta", async () => {
  const { res, nextCount } = await runMiddleware({
    decoded: { uid: "blocked-user" },
    userData: { role: "patient", blocked: true },
  });

  assert.equal(nextCount, 0);
  assert.equal(res.statusCode, 403);
});

test("rechaza perfiles inexistentes y falla cerrado ante error de lectura", async () => {
  const missing = await runMiddleware({
    decoded: { uid: "missing-user" },
    userData: null,
    exists: false,
  });
  const unavailable = await runMiddleware({
    decoded: { uid: "network-user" },
    userData: null,
    dbError: new Error("unavailable"),
  });

  assert.equal(missing.res.statusCode, 403);
  assert.equal(unavailable.res.statusCode, 503);
  assert.equal(missing.nextCount, 0);
  assert.equal(unavailable.nextCount, 0);
});
