const crypto = require("node:crypto");

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = 400;
  }
}

const requirePlainObject = (value, fieldName = "solicitud") => {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new ValidationError(`La ${fieldName} no tiene un formato válido.`);
  }

  return value;
};

const requireString = (
  value,
  fieldName,
  { minLength = 1, maxLength = 500, pattern = null } = {}
) => {
  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} debe ser texto.`);
  }

  const normalized = value.trim();

  if (
    normalized.length < minLength ||
    normalized.length > maxLength ||
    (pattern && !pattern.test(normalized))
  ) {
    throw new ValidationError(`${fieldName} no tiene un formato válido.`);
  }

  return normalized;
};

const optionalString = (value, fieldName, options = {}) => {
  if (value === undefined || value === null || value === "") return "";
  return requireString(value, fieldName, options);
};

const requireBoolean = (value, fieldName) => {
  if (typeof value !== "boolean") {
    throw new ValidationError(`${fieldName} debe ser verdadero o falso.`);
  }

  return value;
};

const requireDocumentId = (value, fieldName = "Identificador") =>
  requireString(value, fieldName, {
    minLength: 1,
    maxLength: 128,
    pattern: /^[A-Za-z0-9_-]+$/,
  });

const requireInviteCode = (value) =>
  requireString(value, "El código", {
    minLength: 8,
    maxLength: 32,
    pattern: /^[A-Za-z0-9_-]+$/,
  }).toUpperCase();

const generateInviteCode = () =>
  crypto.randomBytes(9).toString("base64url").toUpperCase();

const sendValidationError = (res, error) => {
  if (!(error instanceof ValidationError)) return false;

  res.status(error.statusCode).json({ message: error.message });
  return true;
};

module.exports = {
  ValidationError,
  generateInviteCode,
  optionalString,
  requireBoolean,
  requireDocumentId,
  requireInviteCode,
  requirePlainObject,
  requireString,
  sendValidationError,
};
