const {
  normalizeText,
  compareNames,
  compareInstitutions,
} = require("./verificationText");

const SEP_CEDULA_URL =
  "http://search.sep.gob.mx/solr/cedulasCore/select";

const getSepTimeoutMs = (env = process.env) => {
  const configured = Number(env.SEP_TIMEOUT_MS || 8000);
  return Number.isFinite(configured)
    ? Math.min(Math.max(configured, 2000), 15000)
    : 8000;
};

const isMockModeEnabled = (env = process.env) =>
  env.CEDULA_VALIDATION_MODE === "mock" && env.NODE_ENV !== "production";

const isPsychologyTitle = (title = "") => {
  const cleanTitle = normalizeText(title);

  return (
    cleanTitle.includes("psicologia") ||
    cleanTitle.includes("psicologo") ||
    cleanTitle.includes("psicologa") ||
    cleanTitle.includes("ciencias psicologicas")
  );
};

const buildFullName = (record = {}) =>
  [record.nombre, record.paterno, record.materno]
    .filter(Boolean)
    .join(" ")
    .trim();

const searchCedulaSEP = async ({ cedula, fetchImpl, timeoutMs }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const params = new URLSearchParams({
      fl: "numCedula,nombre,paterno,materno,titulo,institucion,anioRegistro",
      q: String(cedula).trim(),
      start: "0",
      rows: "20",
      wt: "json",
    });

    const response = await fetchImpl(`${SEP_CEDULA_URL}?${params.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`SEP_HTTP_${response.status}`);
    }

    const payload = await response.json();

    if (!payload?.response || !Array.isArray(payload.response.docs)) {
      throw new Error("SEP_INVALID_RESPONSE");
    }

    return payload.response.docs;
  } finally {
    clearTimeout(timeout);
  }
};

const pendingResult = (message = "La consulta profesional requiere revisión manual.") => ({
  status: "pending",
  nameMatch: null,
  message,
});

const validateMockCedula = ({ name, cedula, institution, graduationYear }) => {
  if (String(cedula).trim() !== "12345678") {
    return {
      status: "rejected",
      nameMatch: false,
      message: "No se encontró una cédula profesional válida.",
    };
  }

  return {
    status: "approved",
    nameMatch: true,
    message: "Información profesional validada en modo local.",
    professionalData: {
      name,
      institution,
      graduationYear,
      profession: "LICENCIATURA EN PSICOLOGÍA",
      source: "mock",
    },
  };
};

const validateCedula = async (
  { name, cedula, institution, graduationYear },
  options = {}
) => {
  const env = options.env || process.env;
  const fetchImpl = options.fetchImpl || global.fetch;

  if (!name || !cedula || !institution || !graduationYear) {
    return pendingResult("Faltan datos profesionales para completar la verificación.");
  }

  if (!/^\d{6,12}$/.test(String(cedula).trim())) {
    return pendingResult("El número de cédula requiere revisión manual.");
  }

  if (isMockModeEnabled(env)) {
    return validateMockCedula({ name, cedula, institution, graduationYear });
  }

  if (typeof fetchImpl !== "function") {
    return pendingResult("El servicio profesional no está disponible.");
  }

  try {
    const records = await searchCedulaSEP({
      cedula,
      fetchImpl,
      timeoutMs: getSepTimeoutMs(env),
    });
    const cleanCedula = String(cedula).trim();
    const record = records.find(
      (item) => String(item.numCedula || "").trim() === cleanCedula
    );

    if (!record) {
      return {
        status: "rejected",
        nameMatch: false,
        message: "SEP no confirmó la cédula profesional proporcionada.",
      };
    }

    if (!isPsychologyTitle(record.titulo)) {
      return {
        status: "rejected",
        nameMatch: null,
        message: "La formación profesional registrada no corresponde a Psicología.",
      };
    }

    const nameComparison = compareNames(name, buildFullName(record));

    if (nameComparison.status === "contradiction") {
      return {
        status: "rejected",
        nameMatch: false,
        message: "El nombre declarado contradice el registro profesional.",
      };
    }

    if (nameComparison.status === "ambiguous") {
      return pendingResult("El nombre profesional requiere revisión manual.");
    }

    const institutionComparison = compareInstitutions(
      institution,
      record.institucion
    );

    if (institutionComparison === "contradiction") {
      return {
        status: "rejected",
        nameMatch: true,
        message: "La institución declarada contradice el registro profesional.",
      };
    }

    if (institutionComparison === "ambiguous") {
      return pendingResult("La institución profesional requiere revisión manual.");
    }

    if (
      record.anioRegistro &&
      String(record.anioRegistro).trim() !== String(graduationYear).trim()
    ) {
      return {
        status: "rejected",
        nameMatch: true,
        message: "El año declarado contradice el registro profesional.",
      };
    }

    return {
      status: "approved",
      nameMatch: true,
      message: "La información profesional coincide con el registro consultado.",
      professionalData: {
        name: buildFullName(record),
        institution: record.institucion || null,
        graduationYear: record.anioRegistro || null,
        profession: record.titulo,
        source: "sep",
      },
    };
  } catch (error) {
    console.warn("Consulta SEP no disponible para verificación.");
    return pendingResult("SEP no está disponible; la cuenta seguirá en revisión.");
  }
};

module.exports = {
  validateCedula,
  isMockModeEnabled,
  isPsychologyTitle,
  getSepTimeoutMs,
};
