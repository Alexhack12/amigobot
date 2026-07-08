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

const router = express.Router();

const verifyPatientAccess = async (psychologistId, patientId) => {
  const linkSnapshot = await db
    .collection("psychologistPatients")
    .where("psychologistId", "==", psychologistId)
    .where("patientId", "==", patientId)
    .where("active", "==", true)
    .get();

  return !linkSnapshot.empty;
};

router.post("/verify-cedula", verifyToken, async (req, res) => {
  try {
    const { name, cedula } = req.body;

    const result = await validateCedula({ name, cedula });

    if (!result.valid) {
      await db.collection("users").doc(req.user.uid).update({
        verificationStatus: "rejected",
        cedulaValidationMessage: result.message,
      });

      return res.status(400).json(result);
    }

    await db.collection("users").doc(req.user.uid).update({
      role: "psychologist",
      cedula,
      verificationStatus: "approved",
      cedulaData: result.data,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({
      message: "Psicólogo verificado correctamente.",
      result,
    });
  } catch (error) {
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
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();

      await db.collection("invitationCodes").doc(code).set({
        code,
        psychologistId: req.user.uid,
        used: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.json({
        message: "Código generado",
        code,
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
      const { patientId } = req.params;

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
      const { patientId } = req.params;

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
      const { patientId } = req.params;

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
      const { patientId } = req.params;
      const { title, description, dueDate } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({
          message: "El título de la tarea es obligatorio.",
        });
      }

      const hasAccess = await verifyPatientAccess(req.user.uid, patientId);

      if (!hasAccess) {
        return res.status(403).json({
          message: "No tienes acceso a este paciente.",
        });
      }

      const taskRef = await db.collection("patientTasks").add({
        psychologistId: req.user.uid,
        patientId,
        title: title.trim(),
        description: description?.trim() || "",
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
      const { patientId } = req.params;

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
      const { patientId } = req.params;
      const { blocked } = req.body;

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
          blocked: Boolean(blocked),
          blockedAt: blocked
            ? admin.firestore.FieldValue.serverTimestamp()
            : null,
        });
      });

      batch.update(db.collection("users").doc(patientId), {
        blocked: Boolean(blocked),
        blockedByPsychologistId: blocked ? req.user.uid : null,
      });

      await batch.commit();

      return res.json({
        message: blocked
          ? "Paciente bloqueado correctamente."
          : "Paciente desbloqueado correctamente.",
        blocked: Boolean(blocked),
      });
    } catch (error) {
      console.error("Error actualizando bloqueo:", error);

      return res.status(500).json({
        message: "Error actualizando bloqueo del paciente.",
      });
    }
  }
);

module.exports = router;