const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createCedulaService,
  evaluateSepRecords,
} = require("../services/cedulaService");

const psychologyRecord = {
  nombre: "ANA MARÍA",
  paterno: "LÓPEZ",
  materno: "PÉREZ",
  numCedula: "12345678",
  titulo: "LICENCIATURA EN PSICOLOGÍA",
  institucion: "UNIVERSIDAD DE PRUEBA",
  anioRegistro: "2020",
};

test("aprueba únicamente una coincidencia exacta de cédula, nombre y Psicología", () => {
  const result = evaluateSepRecords({
    documents: [psychologyRecord],
    name: "Ana María López Pérez",
    cedula: "12345678",
  });

  assert.equal(result.status, "approved");
  assert.equal(result.valid, true);
});

test("rechaza contradicciones concluyentes del registro profesional", () => {
  const wrongName = evaluateSepRecords({
    documents: [psychologyRecord],
    name: "Otra Persona",
    cedula: "12345678",
  });
  const wrongCareer = evaluateSepRecords({
    documents: [{ ...psychologyRecord, titulo: "LICENCIATURA EN DERECHO" }],
    name: "Ana María López Pérez",
    cedula: "12345678",
  });

  assert.equal(wrongName.status, "rejected");
  assert.equal(wrongCareer.status, "rejected");
});

test("una caída de SEP produce pending y nunca una aprobación ficticia", async () => {
  const service = createCedulaService({
    fetchImpl: async () => {
      throw new Error("SEP unavailable");
    },
  });
  const result = await service.validateCedula({
    name: "Persona de Prueba",
    cedula: "12345678",
  });

  assert.equal(result.status, "pending");
  assert.equal(result.valid, false);
  assert.equal(result.data, undefined);
});

test("el mock queda deshabilitado en producción", async () => {
  const previousMode = process.env.CEDULA_VALIDATION_MODE;
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.CEDULA_VALIDATION_MODE = "mock";
  process.env.NODE_ENV = "production";

  try {
    const service = createCedulaService({
      fetchImpl: async () => {
        throw new Error("No external service in tests");
      },
    });
    const result = await service.validateCedula({
      name: "Persona de Prueba",
      cedula: "12345678",
    });

    assert.equal(result.status, "pending");
  } finally {
    if (previousMode === undefined) delete process.env.CEDULA_VALIDATION_MODE;
    else process.env.CEDULA_VALIDATION_MODE = previousMode;

    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});
