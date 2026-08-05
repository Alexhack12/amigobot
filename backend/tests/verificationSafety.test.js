const test = require("node:test");
const assert = require("node:assert/strict");
const {
  requirePendingPsychologist,
  verificationRateLimitHandler,
} = require("../middleware/verificationGuards");
const {
  ID_DOCUMENT_FIELD,
  VerificationFileError,
  requireExplicitDocumentConsent,
  validateImageFile,
} = require("../services/imageFileService");
const { combineVerificationResults } = require("../services/verificationDecisionService");
const {
  createPsychologistVerificationHandler,
} = require("../controllers/psychologistVerificationController");

const createResponse = () => ({
  statusCode: 200,
  payload: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.payload = payload;
    return this;
  },
});

const validJpeg = () =>
  Buffer.from([
    0xff, 0xd8,
    0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x01, 0x00, 0x01,
    0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00,
    0xff, 0xd9,
  ]);

test("paciente que llama la guarda recibe 403", () => {
  const res = createResponse();
  let nextCalled = false;
  requirePendingPsychologist(
    { user: { role: "patient", verificationStatus: "approved" } },
    res,
    () => { nextCalled = true; }
  );
  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);
});

test("psicólogo approved que repite recibe 409", () => {
  const res = createResponse();
  requirePendingPsychologist(
    { user: { role: "psychologist", verificationStatus: "approved" } },
    res,
    () => assert.fail("no debe continuar")
  );
  assert.equal(res.statusCode, 409);
});

test("psicologo rejected que repite recibe 409", () => {
  const res = createResponse();
  requirePendingPsychologist(
    { user: { role: "psychologist", verificationStatus: "rejected" } },
    res,
    () => assert.fail("no debe continuar")
  );
  assert.equal(res.statusCode, 409);
});

test("el contrato multipart usa idDocument y no el nombre anterior", () => {
  assert.equal(ID_DOCUMENT_FIELD, "idDocument");
  assert.notEqual(ID_DOCUMENT_FIELD, "ineImage");
});

test("el consentimiento acepta unicamente el texto explicito true", () => {
  assert.equal(requireExplicitDocumentConsent({ documentConsent: "true" }), true);
  assert.throws(
    () => requireExplicitDocumentConsent({}),
    (error) => error.statusCode === 400 && error.code === "DOCUMENT_CONSENT_REQUIRED"
  );
  assert.throws(
    () => requireExplicitDocumentConsent({ documentConsent: "false" }),
    (error) => error.statusCode === 400 && error.code === "DOCUMENT_CONSENT_REQUIRED"
  );
  assert.throws(
    () => requireExplicitDocumentConsent({ documentConsent: true }),
    (error) => error.statusCode === 400 && error.code === "DOCUMENT_CONSENT_REQUIRED"
  );
});

test("solicitud sin archivo produce 400 y la cuenta permanece pending", () => {
  const account = { verificationStatus: "pending" };

  assert.throws(
    () => validateImageFile(undefined),
    (error) => error instanceof VerificationFileError && error.statusCode === 400
  );
  assert.equal(account.verificationStatus, "pending");
});

test("archivo mayor al límite produce 413 y la cuenta permanece pending", () => {
  const account = { verificationStatus: "pending" };
  const file = {
    originalname: "ine.jpg",
    mimetype: "image/jpeg",
    buffer: Buffer.alloc(1024 * 1024 + 1, 0),
  };
  file.buffer[0] = 0xff;
  file.buffer[1] = 0xd8;
  file.buffer[2] = 0xff;
  file.buffer[3] = 0xc0;
  file.buffer[4] = 0x00;
  file.buffer[5] = 0x11;
  file.buffer[6] = 0x08;
  file.buffer[7] = 0x00;
  file.buffer[8] = 0x01;
  file.buffer[9] = 0x00;
  file.buffer[10] = 0x01;
  file.buffer[file.buffer.length - 2] = 0xff;
  file.buffer[file.buffer.length - 1] = 0xd9;

  assert.throws(
    () => validateImageFile(file, { INE_MAX_FILE_SIZE_MB: "0.0001" }),
    (error) => error instanceof VerificationFileError && error.statusCode === 413
  );
  assert.equal(account.verificationStatus, "pending");
});

test("MIME no permitido produce 415 y la cuenta permanece pending", () => {
  const account = { verificationStatus: "pending" };

  assert.throws(
    () => validateImageFile({
      originalname: "ine.gif",
      mimetype: "image/gif",
      buffer: Buffer.from("GIF89a"),
    }),
    (error) => error.statusCode === 415
  );
  assert.equal(account.verificationStatus, "pending");
});

test("SVG renombrado como PNG es rechazado", () => {
  assert.throws(
    () => validateImageFile({
      originalname: "ine.png",
      mimetype: "image/png",
      buffer: Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>"),
    }),
    (error) => error.statusCode === 415
  );
});

test("JPEG con cabecera pero estructura corrupta es rechazado", () => {
  assert.throws(
    () => validateImageFile({
      originalname: "ine.jpg",
      mimetype: "image/jpeg",
      buffer: Buffer.from([0xff, 0xd8, 0x01, 0x02, 0xff, 0xd9]),
    }),
    (error) => error.statusCode === 415
  );
});

test("SEP y documento aprobados combinan approved", () => {
  const result = combineVerificationResults(
    { status: "approved", nameMatch: true },
    { status: "approved", nameMatch: true, needsManualReview: false }
  );
  assert.equal(result.status, "approved");
});

test("falla técnica documental nunca convierte approved de SEP en rejected", () => {
  const result = combineVerificationResults(
    { status: "approved", nameMatch: true },
    { status: "pending", nameMatch: null, needsManualReview: true }
  );
  assert.equal(result.status, "pending");
});

test("rechazo producido solamente por IA nunca provoca rejected", () => {
  const result = combineVerificationResults(
    { status: "approved", nameMatch: true },
    { status: "rejected", nameMatch: false, needsManualReview: false }
  );
  assert.equal(result.status, "pending");
  assert.equal(result.checks.needsManualReview, true);
});

test("contradicción concluyente de SEP sí puede producir rejected", () => {
  const result = combineVerificationResults(
    { status: "rejected", nameMatch: false, message: "Contradicción SEP." },
    { status: "pending", nameMatch: null, needsManualReview: true }
  );
  assert.equal(result.status, "rejected");
  assert.equal(result.message, "Contradicción SEP.");
});

test("rate limit responde 429 y no cambia una cuenta pending", () => {
  const account = { verificationStatus: "pending" };
  const res = createResponse();

  verificationRateLimitHandler(
    { user: { uid: "rate-limited-user" } },
    res
  );

  assert.equal(res.statusCode, 429);
  assert.equal(account.verificationStatus, "pending");
});

test("archivo inválido devuelve error y no actualiza la cuenta pending", async () => {
  const account = { verificationStatus: "pending" };
  let updateCalled = false;
  const handler = createPsychologistVerificationHandler({
    db: {
      collection: () => ({
        doc: () => ({
          update: async () => {
            updateCalled = true;
          },
        }),
      }),
    },
    serverTimestamp: () => "mock-timestamp",
    validateCedula: async () => assert.fail("SEP no debe ejecutarse"),
    analyzeIdentityDocument: async () => assert.fail("IA no debe ejecutarse"),
    validateImageFile: () => {
      throw new VerificationFileError("Archivo inválido.", 415);
    },
  });
  const req = {
    user: { uid: "test-user" },
    body: { documentConsent: "true" },
    file: { buffer: Buffer.from("not-an-image") },
  };
  const res = createResponse();
  let nextError;

  await handler(req, res, (error) => {
    nextError = error;
  });

  assert.equal(nextError.statusCode, 415);
  assert.equal(updateCalled, false);
  assert.equal(account.verificationStatus, "pending");
  assert.equal(req.file.buffer, null);
});

test("error 500 inesperado no convierte la cuenta pending en rejected", async () => {
  const account = { verificationStatus: "pending" };
  let updateCalled = false;
  const handler = createPsychologistVerificationHandler({
    db: {
      collection: () => ({
        doc: () => ({
          update: async () => {
            updateCalled = true;
          },
        }),
      }),
    },
    serverTimestamp: () => "mock-timestamp",
    validateCedula: async () => {
      throw new Error("mock service failure");
    },
    analyzeIdentityDocument: async () => assert.fail("IA no debe ejecutarse"),
    validateImageFile: () => ({ mimeType: "image/jpeg" }),
  });
  const req = {
    user: { uid: "test-user" },
    body: {
      declaredFullName: "MARIA LOPEZ HERNANDEZ",
      cedula: "7654321",
      declaredInstitution: "UNAM",
      declaredGraduationYear: "2020",
      documentConsent: "true",
    },
    file: { buffer: validJpeg() },
  };
  const res = createResponse();
  let nextError;

  await handler(req, res, (error) => {
    nextError = error;
  });

  assert.match(nextError.message, /mock service failure/);
  assert.equal(updateCalled, false);
  assert.equal(account.verificationStatus, "pending");
});

test("controlador usa mocks, guarda resumen mínimo y borra el buffer", async () => {
  let savedData;
  const db = {
    collection: () => ({
      doc: () => ({
        update: async (data) => { savedData = data; },
      }),
    }),
  };
  const handler = createPsychologistVerificationHandler({
    db,
    serverTimestamp: () => "mock-timestamp",
    validateCedula: async () => ({ status: "approved", nameMatch: true }),
    analyzeIdentityDocument: async () => ({
      status: "approved",
      nameMatch: true,
      needsManualReview: false,
    }),
    validateImageFile: () => ({ mimeType: "image/jpeg" }),
  });
  const req = {
    user: { uid: "test-user" },
    body: {
      declaredFullName: "MARIA LOPEZ HERNANDEZ",
      cedula: "7654321",
      declaredInstitution: "UNAM",
      declaredGraduationYear: "2020",
      documentConsent: "true",
    },
    file: {
      originalname: "ine.jpg",
      mimetype: "image/jpeg",
      buffer: validJpeg(),
    },
  };
  const res = createResponse();
  let nextError;

  await handler(req, res, (error) => { nextError = error; });

  assert.equal(nextError, undefined);
  assert.equal(res.payload.verificationStatus, "approved");
  assert.equal(savedData.verificationStatus, "approved");
  assert.equal(savedData.role, undefined);
  assert.equal(savedData.idDocument, undefined);
  assert.equal(savedData.visibleName, undefined);
  assert.equal(savedData.curp, undefined);
  assert.equal(res.payload.visibleName, undefined);
  assert.equal(res.payload.curp, undefined);
  assert.equal(req.file.buffer, null);
});

const assertConsentRejectionDoesNotProcess = async (documentConsent) => {
  const account = { verificationStatus: "pending" };
  const calls = { file: 0, sep: 0, ai: 0, update: 0 };
  const handler = createPsychologistVerificationHandler({
    db: {
      collection: () => ({
        doc: () => ({
          update: async () => { calls.update += 1; },
        }),
      }),
    },
    serverTimestamp: () => "mock-timestamp",
    validateCedula: async () => { calls.sep += 1; },
    analyzeIdentityDocument: async () => { calls.ai += 1; },
    validateImageFile: () => { calls.file += 1; },
  });
  const body = {
    declaredFullName: "PERSONA FICTICIA",
    cedula: "12345678",
    declaredInstitution: "UNIVERSIDAD FICTICIA",
    declaredGraduationYear: "2020",
  };
  if (documentConsent !== undefined) body.documentConsent = documentConsent;

  const req = {
    user: { uid: "pending-test-user" },
    body,
    file: { buffer: validJpeg() },
  };
  const res = createResponse();

  await handler(req, res, (error) => assert.fail(error));

  assert.equal(res.statusCode, 400);
  assert.deepEqual(calls, { file: 0, sep: 0, ai: 0, update: 0 });
  assert.equal(account.verificationStatus, "pending");
  assert.equal(req.file.buffer, null);
};

test("falta consentimiento: 400, cuenta pending y ningun procesamiento", async () => {
  await assertConsentRejectionDoesNotProcess(undefined);
});

test("consentimiento false: 400, cuenta pending y ningun procesamiento", async () => {
  await assertConsentRejectionDoesNotProcess("false");
});
