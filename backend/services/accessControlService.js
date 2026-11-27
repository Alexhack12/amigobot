const createAccessControlService = (db) => ({
  async verifyPatientAccess(psychologistId, patientId) {
    if (!psychologistId || !patientId || psychologistId === patientId) {
      return false;
    }

    const linkSnapshot = await db
      .collection("psychologistPatients")
      .where("psychologistId", "==", psychologistId)
      .where("patientId", "==", patientId)
      .where("active", "==", true)
      .limit(1)
      .get();

    return !linkSnapshot.empty;
  },
});

module.exports = { createAccessControlService };
