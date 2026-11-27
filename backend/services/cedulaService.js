const SEP_CEDULA_URL =
  "https://search.sep.gob.mx/solr/cedulasCore/select";

const normalizeText = (text = "") =>
  String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

const isPsychologyTitle = (title = "") => {
  const cleanTitle = normalizeText(title);
  return /\bpsicolog(?:ia|o|a)\b/.test(cleanTitle);
};

const buildFullName = (document = {}) =>
  [document.nombre, document.paterno, document.materno]
    .filter(Boolean)
    .join(" ")
    .trim();

const namesAreCompatible = (declaredName, officialName) => {
  const declared = normalizeText(declaredName);
  const official = normalizeText(officialName);

  if (!declared || !official) return false;
  return official.includes(declared) || declared.includes(official);
};

const findExactCedula = (documents, cedula) => {
  const cleanCedula = String(cedula || "").trim();
  return (
    documents.find(
      (document) => String(document.numCedula || "").trim() === cleanCedula
    ) || null
  );
};

const evaluateSepRecords = ({ documents, name, cedula }) => {
  const match = findExactCedula(documents, cedula);

  if (!match) {
    return {
      status: "rejected",
      valid: false,
      message: "La cédula no fue encontrada en la respuesta oficial.",
    };
  }

  const officialName = buildFullName(match);

  if (!namesAreCompatible(name, officialName)) {
    return {
      status: "rejected",
      valid: false,
      message: "El nombre no coincide con el registro profesional.",
    };
  }

  if (!isPsychologyTitle(match.titulo)) {
    return {
      status: "rejected",
      valid: false,
      message: "La cédula corresponde a una profesión distinta de Psicología.",
    };
  }

  return {
    status: "approved",
    valid: true,
    message: "Cédula validada correctamente.",
    data: {
      name: officialName,
      cedula: String(match.numCedula || ""),
      profession: match.titulo || "",
      institution: match.institucion || "",
      year: match.anioRegistro || null,
      source: "sep",
    },
  };
};

const getMockResult = ({ name, cedula }) => ({
  status: "approved",
  valid: true,
  message: "Cédula validada mediante el adaptador local de pruebas.",
  data: {
    name,
    cedula,
    profession: "LICENCIATURA EN PSICOLOGÍA",
    institution: "Institución ficticia para pruebas",
    year: "2026",
    source: "mock",
  },
});

const createCedulaService = ({ fetchImpl = fetch } = {}) => ({
  async validateCedula({ name, cedula }) {
    const cleanName = String(name || "").trim();
    const cleanCedula = String(cedula || "").trim();

    if (!cleanName || !/^\d{6,20}$/.test(cleanCedula)) {
      return {
        status: "rejected",
        valid: false,
        message: "El nombre o la cédula no tienen un formato válido.",
      };
    }

    if (
      process.env.CEDULA_VALIDATION_MODE === "mock" &&
      process.env.NODE_ENV !== "production"
    ) {
      return getMockResult({ name: cleanName, cedula: cleanCedula });
    }

    try {
      const params = new URLSearchParams({
        fl: "nombre,paterno,materno,numCedula,titulo,institucion,anioRegistro",
        q: cleanCedula,
        start: "0",
        rows: "10",
        wt: "json",
      });
      const timeoutMs = Number(process.env.SEP_TIMEOUT_MS) || 8000;
      const response = await fetchImpl(
        `${SEP_CEDULA_URL}?${params.toString()}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(timeoutMs),
        }
      );

      if (!response.ok) {
        throw new Error(`SEP respondió con estado ${response.status}`);
      }

      const payload = await response.json();
      const documents = Array.isArray(payload?.response?.docs)
        ? payload.response.docs
        : [];

      return evaluateSepRecords({
        documents,
        name: cleanName,
        cedula: cleanCedula,
      });
    } catch (error) {
      return {
        status: "pending",
        valid: false,
        message:
          "La validación profesional no está disponible. La cuenta continuará en revisión.",
      };
    }
  },
});

const { validateCedula } = createCedulaService();

module.exports = {
  createCedulaService,
  evaluateSepRecords,
  isPsychologyTitle,
  namesAreCompatible,
  normalizeText,
  validateCedula,
};
