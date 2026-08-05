const { combineVerificationResults } = require("../services/verificationDecisionService");
const {
  DOCUMENT_CONSENT_ERROR_MESSAGE,
  requireExplicitDocumentConsent,
} = require("../services/imageFileService");

const cleanField = (value, maxLength) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const getPublicMessage = (status) => {
  if (status === "approved") return "Información profesional validada";
  if (status === "rejected") {
    return "No fue posible validar la información. Puedes solicitar una revisión manual.";
  }
  return "Verificación pendiente de revisión";
};

const createPsychologistVerificationHandler = ({
  db,
  serverTimestamp,
  validateCedula,
  analyzeIdentityDocument,
  validateImageFile,
}) => async (req, res, next) => {
  const declaredFullName = cleanField(req.body?.declaredFullName, 120);
  const cedula = cleanField(req.body?.cedula, 20);
  const declaredInstitution = cleanField(req.body?.declaredInstitution, 160);
  const declaredGraduationYear = cleanField(req.body?.declaredGraduationYear, 4);

  try {
    try {
      requireExplicitDocumentConsent(req.body);
    } catch {
      return res.status(400).json({
        message: DOCUMENT_CONSENT_ERROR_MESSAGE,
      });
    }

    const fileInfo = validateImageFile(req.file);
    const currentYear = new Date().getFullYear();
    const validYear =
      /^\d{4}$/.test(declaredGraduationYear) &&
      Number(declaredGraduationYear) >= 1900 &&
      Number(declaredGraduationYear) <= currentYear;
    let decision;

    if (!declaredFullName || !cedula || !declaredInstitution || !validYear) {
      decision = combineVerificationResults(
        {
          status: "pending",
          nameMatch: null,
          message: "Faltan datos profesionales para completar la verificación.",
        },
        {
          status: "pending",
          nameMatch: null,
          needsManualReview: true,
          message: "La revisión documental no se ejecutó.",
        }
      );
    } else {
      const sepResult = await validateCedula({
        name: declaredFullName,
        cedula,
        institution: declaredInstitution,
        graduationYear: declaredGraduationYear,
      });
      let documentResult = {
        status: "pending",
        nameMatch: null,
        needsManualReview: true,
        message: "La revisión documental no se ejecutó.",
      };

      if (sepResult.status === "approved") {
        documentResult = await analyzeIdentityDocument({
          imageBuffer: req.file.buffer,
          mimeType: fileInfo.mimeType,
          declaredFullName,
        });
      }

      decision = combineVerificationResults(sepResult, documentResult);
    }

    await db.collection("users").doc(req.user.uid).update({
      verificationStatus: decision.status,
      cedula,
      declaredFullName,
      declaredGraduationYear,
      declaredInstitution,
      verificationChecks: decision.checks,
      verificationMessage: decision.message,
      verificationAttemptedAt: serverTimestamp(),
    });

    return res.json({
      verificationStatus: decision.status,
      message: getPublicMessage(decision.status),
      verificationChecks: decision.checks,
    });
  } catch (error) {
    return next(error);
  } finally {
    if (Buffer.isBuffer(req.file?.buffer)) {
      req.file.buffer.fill(0);
      req.file.buffer = null;
    }
  }
};

module.exports = {
  createPsychologistVerificationHandler,
  getPublicMessage,
};
