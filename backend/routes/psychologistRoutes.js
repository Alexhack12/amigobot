const express = require("express");
const { db, admin } = require("../firebase/firebaseAdmin");
const {
  verifyToken,
  requireApprovedPsychologist,
} = require("../middleware/authMiddleware");
const { validateCedula } = require("../services/cedulaService");
const {
  generateClinicalSummary,
} = require("../services/clinicalSummaryService");
const {
  createAccessControlService,
} = require("../services/accessControlService");
const {
  generateInviteCode,
  optionalString,
  requireBoolean,
  requireDocumentId,
  requirePlainObject,
  requireString,
  sendValidationError,
} = require("../services/securityValidation");

const router = express.Router();
const { verifyPatientAccess } = createAccessControlService(db);

router.post("/verify-cedula", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "psychologist") {
      return res.status(403).json({
        message: "Solo una cuenta registrada como psicólogo puede verificarse.",
      });
    }

    if (req.user.verificationStatus === "approved") {
      return res.status(409).json({
        message: "La cuenta profesional ya está aprobada.",
      });
    }

    requirePlainObject(req.body);
    const name = requireString(req.body.name, "El nombre", {
      minLength: 2,
      maxLength: 120,
    });
    const cedula = requireString(req.body.cedula, "La cédula", {
      minLength: 6,
      maxLength: 20,
      pattern: /^\d+$/,
    });

    const result = await validateCedula({ name, cedula });
    const userRef = db.collection("users").doc(req.user.uid);

    if (result.status === "pending") {
      await userRef.update({
        verificationStatus: "pending",
        cedula,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.status(202).json(result);
    }

    if (result.status === "rejected") {
      await userRef.update({
        verificationStatus: "rejected",
        cedula,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.status(400).json(result);
    }

    await userRef.update({
      cedula,
      verificationStatus: "approved",
      cedulaData: result.data,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({
      message: "Psicólogo verificado correctamente.",
      result,
    });
  } catch (error) {
    if (sendValidationError(res, error)) return;

    console.error("Error verificando cédula:", error);

    return res.status(500).json({
      message: "Error verificando cédula.",
    });
  }
});

router.post(
  "/generate-invite",
  verifyToken,
  requireApprovedPsychologist,
  async (req, res) => {
    try {
      let code;
      let inviteRef;

      for (let attempt = 0; attempt < 5; attempt += 1) {
        code = generateInviteCode();
        inviteRef = db.collection("invitationCodes").doc(code);
        const existing = await inviteRef.get();
        if (!existing.exists) break;
        inviteRef = null;
      }

      if (!inviteRef) {
        throw new Error("No fue posible generar un código único.");
      }

      await inviteRef.set({
        code,
        psychologistId: req.user.uid,
        used: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      return res.json({
        message: "Código generado",
        code,
        expiresInSeconds: 24 * 60 * 60,
      });
    } catch (error) {
      console.error("Error generando código:", error);

      return res.status(500).json({
        message: "Error generando código.",
      });
    }
  }
);

router.get(
  "/patients",
  verifyToken,
  requireApprovedPsychologist,
  async (req, res) => {
    try {
      const snapshot = await db
        .collection("psychologistPatients")
        .where("psychologistId", "==", req.user.uid)
        .where("active", "==", true)
        .get();

      const patients = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return res.json(patients);
    } catch (error) {
      console.error("Error obteniendo pacientes:", error);

      return res.status(500).json({
        message: "Error obteniendo pacientes.",
      });
    }
  }
);

router.get(
  "/patient/:patientId/reports",
  verifyToken,
  requireApprovedPsychologist,
  async (req, res) => {
    try {
      const patientId = requireDocumentId(req.params.patientId, "El paciente");

      const hasAccess = await verifyPatientAccess(req.user.uid, patientId);

      if (!hasAccess) {
        return res.status(403).json({
          message: "No tienes acceso a los reportes de este paciente.",
        });
      }

      const reportsSnapshot = await db
        .collection("behavioralReports")
        .where("userId", "==", patientId)
        .limit(20)
        .get();

      const reports = reportsSnapshot.docs
        .map((doc) => {
          const data = doc.data();

          return {
            id: doc.id,
            emotion: data.emotion || "stable",
            riskLevel: data.riskLevel || "low",
            summary: data.summary || "Sin resumen disponible.",
            behaviorChange:
              data.behaviorChange || "Sin cambio conductual registrado.",
            behaviorSignals: data.behaviorSignals || [],
            influencingFactors: data.influencingFactors || [],
            trend: data.trend || "",
            repeatedFactors: data.repeatedFactors || [],
            emergingFactors: data.emergingFactors || [],
            recommendations: data.recommendations || [],
            createdAt: data.createdAt
              ? data.createdAt.toDate().toISOString()
              : null,
          };
        })
        .sort((a, b) => {
          if (!a.createdAt) return 1;
          if (!b.createdAt) return -1;
          return new Date(b.createdAt) - new Date(a.createdAt);
        })
        .slice(0, 10);

      return res.json(reports);
    } catch (error) {
      if (sendValidationError(res, error)) return;

      console.error("Error obteniendo reportes del paciente:", error);

      return res.status(500).json({
        message: "Error obteniendo reportes del paciente.",
      });
    }
  }
);

router.get(
  "/patient/:patientId/conversations",
  verifyToken,
  requireApprovedPsychologist,
  async (req, res) => {
    try {
      const patientId = requireDocumentId(req.params.patientId, "El paciente");

      const hasAccess = await verifyPatientAccess(req.user.uid, patientId);

      if (!hasAccess) {
        return res.status(403).json({
          message: "No tienes acceso a las conversaciones de este paciente.",
        });
      }

      const conversationsSnapshot = await db
        .collection("conversations")
        .where("userId", "==", patientId)
        .get();

      const conversations = conversationsSnapshot.docs
        .map((doc) => {
          const data = doc.data();

          return {
            id: doc.id,
            title: data.title || "Conversación",
            summary: data.summary || "Sin resumen disponible.",
            dominantEmotion: data.dominantEmotion || "stable",
            riskLevel: data.riskLevel || "low",
            behaviorChange:
              data.behaviorChange || "Sin cambio conductual registrado.",
            behaviorSignals: data.behaviorSignals || [],
            influencingFactors: data.influencingFactors || [],
            trend: data.trend || "",
            repeatedFactors: data.repeatedFactors || [],
            emergingFactors: data.emergingFactors || [],
            recommendations: data.recommendations || [],
            messageCount: data.messageCount || 0,
            updatedAt: data.updatedAt
              ? data.updatedAt.toDate().toISOString()
              : null,
          };
        })
        .filter((conversation) => conversation.messageCount > 0)
        .sort((a, b) => {
          if (!a.updatedAt) return 1;
          if (!b.updatedAt) return -1;
          return new Date(b.updatedAt) - new Date(a.updatedAt);
        });

      return res.json(conversations);
    } catch (error) {
      if (sendValidationError(res, error)) return;

      console.error("Error obteniendo conversaciones del paciente:", error);

      return res.status(500).json({
        message: "Error obteniendo conversaciones del paciente.",
      });
    }
  }
);

router.get(
  "/patient/:patientId/clinical-summary",
  verifyToken,
  requireApprovedPsychologist,
  async (req, res) => {
    try {
      const patientId = requireDocumentId(req.params.patientId, "El paciente");

      const hasAccess = await verifyPatientAccess(req.user.uid, patientId);

      if (!hasAccess) {
        return res.status(403).json({
          message: "No tienes acceso a este paciente.",
        });
      }

      const patientDoc = await db.collection("users").doc(patientId).get();

      const patient = patientDoc.exists
        ? {
            id: patientDoc.id,
            ...patientDoc.data(),
          }
        : null;

      const conversationsSnapshot = await db
        .collection("conversations")
        .where("userId", "==", patientId)
        .get();

      const conversations = conversationsSnapshot.docs.map((doc) => {
        const data = doc.data();

        return {
          id: doc.id,
          ...data,
          updatedAt: data.updatedAt
            ? data.updatedAt.toDate().toISOString()
            : null,
          createdAt: data.createdAt
            ? data.createdAt.toDate().toISOString()
            : null,
        };
      });

      const tasksSnapshot = await db
        .collection("patientTasks")
        .where("patientId", "==", patientId)
        .get();

      const tasks = tasksSnapshot.docs.map((doc) => {
        const data = doc.data();

        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt
            ? data.createdAt.toDate().toISOString()
            : null,
          updatedAt: data.updatedAt
            ? data.updatedAt.toDate().toISOString()
            : null,
        };
      });

      const summary = generateClinicalSummary({
        patient,
        conversations,
        tasks,
      });

      return res.json(summary);
    } catch (error) {
      if (sendValidationError(res, error)) return;

      console.error("Error generando resumen clínico:", error);

      return res.status(500).json({
        message: "Error generando resumen clínico.",
      });
    }
  }
);

router.post(
  "/patient/:patientId/tasks",
  verifyToken,
  requireApprovedPsychologist,
  async (req, res) => {
    try {
      const patientId = requireDocumentId(req.params.patientId, "El paciente");
      requirePlainObject(req.body);
      const title = requireString(req.body.title, "El título", {
        minLength: 1,
        maxLength: 160,
      });
      const description = optionalString(req.body.description, "La descripción", {
        maxLength: 2000,
      });
      const dueDate = optionalString(req.body.dueDate, "La fecha límite", {
        maxLength: 40,
      });

      const hasAccess = await verifyPatientAccess(req.user.uid, patientId);

      if (!hasAccess) {
        return res.status(403).json({
          message: "No tienes acceso a este paciente.",
        });
      }

      const taskRef = await db.collection("patientTasks").add({
        psychologistId: req.user.uid,
        patientId,
        title,
        description,
        dueDate: dueDate || null,
        status: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.json({
        message: "Tarea asignada correctamente.",
        taskId: taskRef.id,
      });
    } catch (error) {
      if (sendValidationError(res, error)) return;

      console.error("Error creando tarea:", error);

      return res.status(500).json({
        message: "Error creando tarea.",
      });
    }
  }
);

router.get(
  "/patient/:patientId/tasks",
  verifyToken,
  requireApprovedPsychologist,
  async (req, res) => {
    try {
      const patientId = requireDocumentId(req.params.patientId, "El paciente");

      const hasAccess = await verifyPatientAccess(req.user.uid, patientId);

      if (!hasAccess) {
        return res.status(403).json({
          message: "No tienes acceso a este paciente.",
        });
      }

      const tasksSnapshot = await db
        .collection("patientTasks")
        .where("patientId", "==", patientId)
        .get();

      const tasks = tasksSnapshot.docs
        .map((doc) => {
          const data = doc.data();

          return {
            id: doc.id,
            title: data.title || "Tarea sin título",
            description: data.description || "",
            status: data.status || "pending",
            dueDate: data.dueDate || null,
            createdAt: data.createdAt
              ? data.createdAt.toDate().toISOString()
              : null,
            updatedAt: data.updatedAt
              ? data.updatedAt.toDate().toISOString()
              : null,
          };
        })
        .sort((a, b) => {
          if (!a.createdAt) return 1;
          if (!b.createdAt) return -1;
          return new Date(b.createdAt) - new Date(a.createdAt);
        });

      return res.json(tasks);
    } catch (error) {
      if (sendValidationError(res, error)) return;

      console.error("Error obteniendo tareas:", error);

      return res.status(500).json({
        message: "Error obteniendo tareas.",
      });
    }
  }
);

router.patch(
  "/patient/:patientId/block",
  verifyToken,
  requireApprovedPsychologist,
  async (req, res) => {
    try {
      const patientId = requireDocumentId(req.params.patientId, "El paciente");
      requirePlainObject(req.body);
      const blocked = requireBoolean(req.body.blocked, "blocked");

      const hasAccess = await verifyPatientAccess(req.user.uid, patientId);

      if (!hasAccess) {
        return res.status(403).json({
          message: "No tienes acceso a este paciente.",
        });
      }

      const linkSnapshot = await db
        .collection("psychologistPatients")
        .where("psychologistId", "==", req.user.uid)
        .where("patientId", "==", patientId)
        .where("active", "==", true)
        .get();

      const batch = db.batch();

      linkSnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          blocked,
          blockedAt: blocked
            ? admin.firestore.FieldValue.serverTimestamp()
            : null,
        });
      });

      batch.update(db.collection("users").doc(patientId), {
        blocked,
        blockedByPsychologistId: blocked ? req.user.uid : null,
      });

      await batch.commit();

      return res.json({
        message: blocked
          ? "Paciente bloqueado correctamente."
          : "Paciente desbloqueado correctamente.",
        blocked,
      });
    } catch (error) {
      if (sendValidationError(res, error)) return;

      console.error("Error actualizando bloqueo:", error);

      return res.status(500).json({
        message: "Error actualizando bloqueo del paciente.",
      });
    }
  }
);

module.exports = router;
