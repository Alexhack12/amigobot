const combineVerificationResults = (sepResult, documentResult) => {
  const sepStatus = sepResult?.status || "pending";
  const documentStatus = documentResult?.status || "pending";

  if (sepStatus === "rejected") {
    return {
      status: "rejected",
      message: sepResult.message,
      checks: {
        sepStatus,
        documentStatus,
        nameMatch: sepResult?.nameMatch ?? null,
        needsManualReview: false,
      },
    };
  }

  if (sepStatus === "approved" && documentStatus === "approved") {
    return {
      status: "approved",
      message: "La información profesional y documental fue validada.",
      checks: {
        sepStatus,
        documentStatus,
        nameMatch: true,
        needsManualReview: false,
      },
    };
  }

  return {
    status: "pending",
    message:
      sepStatus === "pending"
        ? sepResult?.message || "La consulta profesional requiere revisión."
        : documentResult?.message || "La revisión documental requiere revisión.",
    checks: {
      sepStatus,
      documentStatus,
      nameMatch: documentResult?.nameMatch ?? sepResult?.nameMatch ?? null,
      needsManualReview: true,
    },
  };
};

module.exports = { combineVerificationResults };
