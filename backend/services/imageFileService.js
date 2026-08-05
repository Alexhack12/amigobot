const path = require("path");
const multer = require("multer");

const ID_DOCUMENT_FIELD = "idDocument";
const DOCUMENT_CONSENT_ERROR_MESSAGE =
  "Debes autorizar el análisis temporal de la imagen.";

const ALLOWED_EXTENSIONS = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
]);

class VerificationFileError extends Error {
  constructor(message, statusCode = 400, code = "INVALID_FILE") {
    super(message);
    this.name = "VerificationFileError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

const requireExplicitDocumentConsent = (body) => {
  if (body?.documentConsent !== "true") {
    throw new VerificationFileError(
      DOCUMENT_CONSENT_ERROR_MESSAGE,
      400,
      "DOCUMENT_CONSENT_REQUIRED"
    );
  }

  return true;
};

const getMaxImageSizeBytes = (env = process.env) => {
  const configuredMb = Number(env.INE_MAX_FILE_SIZE_MB || 5);
  const safeMb = Number.isFinite(configuredMb)
    ? Math.min(Math.max(configuredMb, 1), 10)
    : 5;

  return Math.floor(safeMb * 1024 * 1024);
};

const hasJpegDimensions = (buffer) => {
  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
    0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
  ]);

  for (let index = 2; index + 8 < buffer.length; index += 1) {
    if (buffer[index] !== 0xff || !startOfFrameMarkers.has(buffer[index + 1])) {
      continue;
    }

    const segmentLength = buffer.readUInt16BE(index + 2);
    const height = buffer.readUInt16BE(index + 5);
    const width = buffer.readUInt16BE(index + 7);

    return segmentLength >= 7 && width > 0 && height > 0;
  }

  return false;
};

const detectImageType = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;

  const isJpeg =
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[buffer.length - 2] === 0xff &&
    buffer[buffer.length - 1] === 0xd9 &&
    hasJpegDimensions(buffer);

  if (isJpeg) return "image/jpeg";

  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const isPng =
    buffer.length >= 33 &&
    buffer.subarray(0, 8).equals(pngSignature) &&
    buffer.toString("ascii", 12, 16) === "IHDR" &&
    buffer.readUInt32BE(16) > 0 &&
    buffer.readUInt32BE(20) > 0 &&
    buffer.toString("ascii", buffer.length - 8, buffer.length - 4) === "IEND";

  if (isPng) return "image/png";

  const isWebp =
    buffer.length >= 20 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP" &&
    ["VP8 ", "VP8L", "VP8X"].includes(buffer.toString("ascii", 12, 16)) &&
    buffer.readUInt32LE(4) + 8 === buffer.length &&
    buffer.readUInt32LE(16) <= buffer.length - 20;

  if (isWebp) return "image/webp";

  return null;
};

const validateImageFile = (file, env = process.env) => {
  if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    throw new VerificationFileError("Debes adjuntar una imagen del INE.");
  }

  if (file.buffer.length > getMaxImageSizeBytes(env)) {
    throw new VerificationFileError(
      "La imagen excede el tamaño máximo permitido.",
      413,
      "FILE_TOO_LARGE"
    );
  }

  const extension = path.extname(file.originalname || "").toLowerCase();
  const expectedMime = ALLOWED_EXTENSIONS.get(extension);

  if (!expectedMime || !ALLOWED_EXTENSIONS.has(extension)) {
    throw new VerificationFileError(
      "Formato no permitido. Usa JPEG, PNG o WEBP.",
      415,
      "UNSUPPORTED_FILE_TYPE"
    );
  }

  if (file.mimetype !== expectedMime) {
    throw new VerificationFileError(
      "La extensión y el tipo del archivo no coinciden.",
      415,
      "MIME_MISMATCH"
    );
  }

  const detectedMime = detectImageType(file.buffer);

  if (!detectedMime || detectedMime !== expectedMime) {
    throw new VerificationFileError(
      "El archivo está vacío, corrupto o no corresponde a una imagen permitida.",
      415,
      "INVALID_IMAGE_CONTENT"
    );
  }

  return { mimeType: detectedMime, size: file.buffer.length };
};

const createIneUpload = (env = process.env) =>
  multer({
    storage: multer.memoryStorage(),
    limits: {
      files: 1,
      fileSize: getMaxImageSizeBytes(env),
    },
    fileFilter(req, file, callback) {
      try {
        requireExplicitDocumentConsent(req.body);
      } catch (error) {
        return callback(error);
      }

      const extension = path.extname(file.originalname || "").toLowerCase();
      const expectedMime = ALLOWED_EXTENSIONS.get(extension);

      if (!expectedMime || expectedMime !== file.mimetype) {
        return callback(
          new VerificationFileError(
            "Formato no permitido. Usa JPEG, PNG o WEBP.",
            415,
            "UNSUPPORTED_FILE_TYPE"
          )
        );
      }

      return callback(null, true);
    },
  });

module.exports = {
  ID_DOCUMENT_FIELD,
  DOCUMENT_CONSENT_ERROR_MESSAGE,
  VerificationFileError,
  requireExplicitDocumentConsent,
  getMaxImageSizeBytes,
  detectImageType,
  validateImageFile,
  createIneUpload,
};
