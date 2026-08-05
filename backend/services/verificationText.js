const normalizeText = (value = "") =>
  String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const IGNORED_NAME_WORDS = new Set(["de", "del", "la", "las", "los", "y"]);

const meaningfulTokens = (value, ignored = new Set()) =>
  normalizeText(value)
    .split(" ")
    .filter((token) => token && !ignored.has(token));

const compareNames = (declaredName, officialName) => {
  const declared = meaningfulTokens(declaredName, IGNORED_NAME_WORDS);
  const official = meaningfulTokens(officialName, IGNORED_NAME_WORDS);

  if (declared.length < 2 || official.length < 2) {
    return { status: "ambiguous", matches: null };
  }

  const officialSet = new Set(official);
  const shared = declared.filter((token) => officialSet.has(token)).length;
  const score = shared / Math.max(declared.length, official.length);

  if (score >= 0.7) return { status: "match", matches: true };
  if (shared === 0 || score < 0.35) {
    return { status: "contradiction", matches: false };
  }

  return { status: "ambiguous", matches: null };
};

const compareInstitutions = (declaredInstitution, officialInstitution) => {
  if (!officialInstitution) return "not_available";

  const ignored = new Set([
    "de",
    "del",
    "la",
    "las",
    "los",
    "universidad",
    "instituto",
    "escuela",
  ]);
  const declared = meaningfulTokens(declaredInstitution, ignored);
  const official = meaningfulTokens(officialInstitution, ignored);

  if (declared.length === 0 || official.length === 0) return "ambiguous";

  const officialSet = new Set(official);
  const shared = declared.filter((token) => officialSet.has(token)).length;

  if (shared >= Math.min(2, declared.length, official.length)) return "match";
  if (declared.length === 1 || official.length === 1) return "ambiguous";
  if (shared === 0) return "contradiction";
  return "ambiguous";
};

module.exports = {
  normalizeText,
  compareNames,
  compareInstitutions,
};
