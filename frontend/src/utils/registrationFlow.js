export const isPsychologistRegistration = (role) => role === "psychologist";
export const REGISTRATION_DASHBOARD_PATH = "/dashboard";

export const buildPsychologistVerificationFormData = ({
  declaredFullName,
  cedula,
  declaredGraduationYear,
  declaredInstitution,
  documentConsent,
  idDocument,
}) => {
  const formData = new FormData();

  formData.append("declaredFullName", declaredFullName);
  formData.append("cedula", cedula);
  formData.append("declaredGraduationYear", declaredGraduationYear);
  formData.append("declaredInstitution", declaredInstitution);
  formData.append("documentConsent", documentConsent === true ? "true" : "false");
  formData.append("idDocument", idDocument);

  return formData;
};

export const buildRegistrationUserData = ({
  uid,
  name,
  email,
  role,
  cedula,
  graduationYear,
  institution,
  createdAt,
}) => {
  const isPsychologist = isPsychologistRegistration(role);

  return {
    uid,
    name: name.trim(),
    email: email.trim(),
    role,
    cedula: isPsychologist ? cedula.trim() : null,
    verificationStatus: isPsychologist ? "pending" : "approved",
    createdAt,
    ...(isPsychologist
      ? {
          declaredFullName: name.trim(),
          declaredGraduationYear: graduationYear.trim(),
          declaredInstitution: institution.trim(),
        }
      : {}),
  };
};

export const completePsychologistVerification = async (verify, payload) => {
  try {
    const result = await verify(payload);
    return result.message || "Verificación pendiente de revisión";
  } catch {
    return "Verificación pendiente de revisión";
  }
};
