const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeIdentityDocument } = require("../services/aiService");

const input = {
  imageBuffer: Buffer.from("temporary-image"),
  mimeType: "image/jpeg",
  declaredFullName: "MARIA LOPEZ HERNANDEZ",
};

const reviewResponse = (review) => ({
  ok: true,
  status: 200,
  json: async () => ({ output_text: JSON.stringify(review) }),
});

const validReview = {
  documentAppearsValid: true,
  imageReadable: true,
  visibleName: "MARIA LOPEZ HERNANDEZ",
  nameMatchesClaim: true,
  contradictions: [],
  needsManualReview: false,
  reason: "Documento legible.",
};

const runReview = (review) =>
  analyzeIdentityDocument(input, {
    apiKey: "test-key-not-real",
    env: { OPENAI_VERIFICATION_TIMEOUT_MS: "3000" },
    fetchImpl: async () => reviewResponse(review),
  });

test("documento legible y nombre coincidente produce approved documental", async () => {
  const result = await runReview(validReview);
  assert.equal(result.status, "approved");
});

test("caída de OpenAI produce pending", async () => {
  const result = await analyzeIdentityDocument(input, {
    apiKey: "test-key-not-real",
    env: { OPENAI_VERIFICATION_TIMEOUT_MS: "3000" },
    fetchImpl: async () => {
      throw new Error("network down");
    },
  });
  assert.equal(result.status, "pending");
});

test("imagen ilegible produce pending", async () => {
  const result = await runReview({
    ...validReview,
    imageReadable: false,
    needsManualReview: true,
  });
  assert.equal(result.status, "pending");
});

test("nombre extraído ambiguo produce pending", async () => {
  const result = await runReview({
    ...validReview,
    visibleName: "MARIA LOPEZ",
    nameMatchesClaim: false,
    needsManualReview: true,
  });
  assert.equal(result.status, "pending");
});

test("IA devuelve nombre distinto y el resultado permanece pending", async () => {
  const result = await runReview({
    ...validReview,
    visibleName: "JUAN PEREZ RAMIREZ",
    nameMatchesClaim: false,
  });
  assert.equal(result.status, "pending");
});

test("IA dice que el archivo no parece INE y el resultado permanece pending", async () => {
  const result = await runReview({
    ...validReview,
    documentAppearsValid: false,
  });
  assert.equal(result.status, "pending");
});

test("IA devuelve campos prohibidos y el resultado seguro es pending", async () => {
  const result = await runReview({
    ...validReview,
    curp: "DATO-PROHIBIDO-DE-PRUEBA",
  });

  assert.equal(result.status, "pending");
  assert.equal(result.curp, undefined);
  assert.equal(result.visibleName, undefined);
});

test("JSON de IA inválido produce pending", async () => {
  const result = await analyzeIdentityDocument(input, {
    apiKey: "test-key-not-real",
    env: { OPENAI_VERIFICATION_TIMEOUT_MS: "3000" },
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ output_text: "not-json" }),
    }),
  });
  assert.equal(result.status, "pending");
});

test("solicitud documental usa store false y reglas contra biometría", async () => {
  let requestBody;
  await analyzeIdentityDocument(input, {
    apiKey: "test-key-not-real",
    env: { OPENAI_VERIFICATION_TIMEOUT_MS: "3000" },
    fetchImpl: async (url, options) => {
      requestBody = JSON.parse(options.body);
      return reviewResponse(validReview);
    },
  });

  const prompt = requestBody.input[0].content[0].text;
  assert.equal(requestBody.store, false);
  assert.equal(requestBody.input[0].content[1].type, "input_image");
  assert.match(prompt, /No realices reconocimiento facial/);
  assert.match(prompt, /No infieras/);
  assert.match(prompt, /No transcribas ni reveles CURP/);
});
