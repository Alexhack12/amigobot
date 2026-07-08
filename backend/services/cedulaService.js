const SEP_CEDULA_URL =
  "http://search.sep.gob.mx/solr/cedulasCore/select";

const normalizeText = (text = "") =>
  String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const isPsychologyTitle = (title = "") => {
  const cleanTitle = normalizeText(title);

  return (
    cleanTitle.includes("psicologia") ||
    cleanTitle.includes("psicologo") ||
    cleanTitle.includes("psicologa")
  );
};

const buildFullName = (doc = {}) => {
  return [doc.nombre, doc.paterno, doc.materno]
    .filter(Boolean)
    .join(" ")
    .trim();
};

const searchCedulaSEP = async ({ name, cedula }) => {
  const query = cedula?.trim() || name?.trim();

  if (!query) {
    throw new Error("No hay datos suficientes para consultar la cédula.");
  }

  const params = new URLSearchParams({
    fl: "*,score",
    q: query,
    start: "0",
    rows: "50",
    facet: "true",
    indent: "on",
    wt: "json",
  });

  const response = await fetch(`${SEP_CEDULA_URL}?${params.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("No se pudo consultar el Registro Nacional de Profesionistas.");
  }

  const data = await response.json();
  return data?.response?.docs || [];
};

const findBestMatch = ({ docs, name, cedula }) => {
  const cleanName = normalizeText(name);
  const cleanCedula = String(cedula || "").trim();

  const exactCedulaMatch = docs.find(
    (doc) => String(doc.numCedula || "").trim() === cleanCedula
  );

  if (exactCedulaMatch) {
    return exactCedulaMatch;
  }

  if (!cleanName) {
    return null;
  }

  return (
    docs.find((doc) => {
      const docName = normalizeText(buildFullName(doc));
      return docName.includes(cleanName) || cleanName.includes(docName);
    }) || null
  );
};

const validateWithDemoFallback = ({ name, cedula }) => {
  const demoCedulas = ["12345678", "87654321", "11111111"];

  if (demoCedulas.includes(String(cedula).trim())) {
    return {
      valid: true,
      message: "Cédula validada en modo demostración.",
      data: {
        name,
        cedula,
        profession: "LICENCIATURA EN PSICOLOGÍA",
        institution: "Universidad de demostración",
        year: "2026",
        source: "demo",
      },
    };
  }

  return {
    valid: false,
    message:
      "No se encontró una cédula válida de Psicología. Verifica el nombre y número de cédula.",
  };
};

const validateCedula = async ({ name, cedula }) => {
  if (!cedula || cedula.trim().length < 6) {
    return {
      valid: false,
      message: "La cédula no tiene un formato válido.",
    };
  }

  try {
    const docs = await searchCedulaSEP({ name, cedula });
    console.log("========== RESPUESTA SEP ==========");
console.log(docs);
console.log("==================================");
    const match = findBestMatch({ docs, name, cedula });

    if (!match) {
      return validateWithDemoFallback({ name, cedula });
    }

    if (!isPsychologyTitle(match.titulo)) {
      return {
        valid: false,
        message:
          "La cédula existe, pero no corresponde a una formación en Psicología.",
        data: {
          name: buildFullName(match),
          cedula: match.numCedula,
          profession: match.titulo,
          institution: match.institucion,
          year: match.anioRegistro,
          source: "sep",
        },
      };
    }

    return {
      valid: true,
      message: "Cédula validada correctamente.",
      data: {
        name: buildFullName(match),
        cedula: match.numCedula,
        profession: match.titulo,
        institution: match.institucion,
        year: match.anioRegistro,
        source: "sep",
      },
    };
  } catch (error) {
    console.error("Error consultando SEP:", error.message);
console.log("ERROR SEP");
    console.log(error);

    return validateWithDemoFallback({ name, cedula });
  }
};

module.exports = {
  validateCedula,
};