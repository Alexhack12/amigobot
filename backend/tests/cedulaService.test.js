const test = require("node:test");
const assert = require("node:assert/strict");
const { validateCedula, isMockModeEnabled } = require("../services/cedulaService");

const professionalInput = {
  name: "MARIA LOPEZ HERNANDEZ",
  cedula: "7654321",
  institution: "Universidad Nacional Autónoma de México",
  graduationYear: "2020",
};

const responseWith = (docs) => ({
  ok: true,
  status: 200,
  json: async () => ({ response: { docs } }),
});

const psychologyRecord = {
  numCedula: "7654321",
  nombre: "MARIA",
  paterno: "LOPEZ",
  materno: "HERNANDEZ",
  titulo: "LICENCIATURA EN PSICOLOGÍA",
  institucion: "UNIVERSIDAD NACIONAL AUTONOMA DE MEXICO",
  anioRegistro: "2020",
};

test("SEP concluyente con Psicología y datos coincidentes produce approved", async () => {
  const result = await validateCedula(professionalInput, {
    fetchImpl: async () => responseWith([psychologyRecord]),
    env: { NODE_ENV: "test", SEP_TIMEOUT_MS: "2000" },
  });

  assert.equal(result.status, "approved");
  assert.equal(result.nameMatch, true);
});

test("caída de SEP produce pending", async () => {
  const result = await validateCedula(professionalInput, {
    fetchImpl: async () => {
      throw new Error("network down");
    },
    env: { NODE_ENV: "test", SEP_TIMEOUT_MS: "2000" },
  });

  assert.equal(result.status, "pending");
});

test("carrera distinta de Psicología produce rejected", async () => {
  const result = await validateCedula(professionalInput, {
    fetchImpl: async () =>
      responseWith([{ ...psychologyRecord, titulo: "LICENCIATURA EN DERECHO" }]),
    env: { NODE_ENV: "test", SEP_TIMEOUT_MS: "2000" },
  });

  assert.equal(result.status, "rejected");
});

test("modo mock queda deshabilitado en production", async () => {
  let fetchCalled = false;
  const result = await validateCedula(
    { ...professionalInput, cedula: "12345678" },
    {
      env: { NODE_ENV: "production", CEDULA_VALIDATION_MODE: "mock" },
      fetchImpl: async () => {
        fetchCalled = true;
        return responseWith([]);
      },
    }
  );

  assert.equal(isMockModeEnabled({ NODE_ENV: "production", CEDULA_VALIDATION_MODE: "mock" }), false);
  assert.equal(fetchCalled, true);
  assert.equal(result.status, "rejected");
});
