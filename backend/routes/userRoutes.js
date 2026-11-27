const express = require("express");
const { db, admin } = require("../firebase/firebaseAdmin");
const {
  verifyFirebaseToken,
  verifyToken,
} = require("../middleware/authMiddleware");
const {
  requireDocumentId,
  requireInviteCode,
  requirePlainObject,
  requireString,
  sendValidationError,
} = require("../services/securityValidation");
const {
  buildExistingUserSync,
  buildNewUserProfile,
} = require("../services/userSyncService");

const router = express.Router();

router.get("/me", verifyToken, async (req, res) => {
  try {
    const userRef = db.collection("users").doc(req.user.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({
        message: "Usuario no encontrado",
      });
    }

    const data = userDoc.data();

    return res.json({
      id: userDoc.id,
      uid: req.user.uid,
      name: data.name || "Usuario",
      email: req.user.email,
      role: data.role,
      verificationStatus: data.verificationStatus,
      blocked: data.blocked === true,
      cedula: data.role === "psychologist" ? data.cedula || null : null,
    });
  } catch (error) {
    console.error("Error obteniendo usuario:", error);

    return res.status(500).json({
      message: "Error obteniendo usuario",
    });
  }
});

router.post("/sync", verifyFirebaseToken, async (req, res) => {
  try {
    requirePlainObject(req.body);

    const name = requireString(req.body.name, "El nombre", {
      minLength: 2,
      maxLength: 120,
    });
    const requestedRole = req.body.role;

    if (!["patient", "psychologist"].includes(requestedRole)) {
      return res.status(400).json({ message: "El rol solicitado no es válido." });
    }

    const cedula =
      requestedRole === "psychologist"
        ? requireString(req.body.cedula, "La cédula", {
            minLength: 6,
            maxLength: 20,
            pattern: /^\d+$/,
          })
        : null;

    const userRef = db.collection("users").doc(req.authUser.uid);
    let responseUser;

    await db.runTransaction(async (transaction) => {
      const existingDoc = await transaction.get(userRef);

      if (existingDoc.exists) {
        const existing = existingDoc.data();
        const { update, response } = buildExistingUserSync({
          existing,
          name,
          tokenEmail: req.authUser.email,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        transaction.set(userRef, update, { merge: true });
        responseUser = {
          uid: req.authUser.uid,
          ...response,
        };
        return;
      }

      responseUser = buildNewUserProfile({
        uid: req.authUser.uid,
        tokenEmail: req.authUser.email,
        name,
        requestedRole,
        cedula,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      transaction.create(userRef, responseUser);
    });

    return res.json({
      message: "Usuario sincronizado",
      user: responseUser,
    });
  } catch (error) {
    if (sendValidationError(res, error)) return;

    console.error("Error sincronizando usuario:", error);

    return res.status(500).json({
      message: "Error sincronizando usuario",
    });
  }
});

router.post("/link-psychologist", verifyToken, async (req, res) => {
  try {
    requirePlainObject(req.body);
    const code = requireInviteCode(req.body.code);

    const inviteRef = db.collection("invitationCodes").doc(code);
    const patientRef = db.collection("users").doc(req.user.uid);
    const linkRef = db.collection("psychologistPatients").doc();

    await db.runTransaction(async (transaction) => {
      const [inviteDoc, patientDoc] = await Promise.all([
        transaction.get(inviteRef),
        transaction.get(patientRef),
      ]);

      if (!inviteDoc.exists) {
        const error = new Error("Código inválido.");
        error.statusCode = 404;
        throw error;
      }

      if (!patientDoc.exists) {
        const error = new Error("Paciente no encontrado.");
        error.statusCode = 404;
        throw error;
      }

      const inviteData = inviteDoc.data();
      const patientData = patientDoc.data();

      if (patientData.role !== "patient") {
        const error = new Error(
          "Solo los pacientes pueden vincularse con un psicólogo."
        );
        error.statusCode = 403;
        throw error;
      }

      if (inviteData.used === true) {
        const error = new Error("Este código ya fue utilizado.");
        error.statusCode = 409;
        throw error;
      }

      const createdAtMillis = inviteData.createdAt?.toMillis?.() || 0;
      const expiresAtMillis =
        inviteData.expiresAt?.toMillis?.() ||
        (createdAtMillis ? createdAtMillis + 24 * 60 * 60 * 1000 : 0);

      if (!expiresAtMillis || expiresAtMillis <= Date.now()) {
        const error = new Error("Este código ha expirado.");
        error.statusCode = 410;
        throw error;
      }

      transaction.create(linkRef, {
        psychologistId: inviteData.psychologistId,
        patientId: req.user.uid,
        patientName: patientData.name || "Paciente",
        patientEmail: patientData.email || req.user.email,
        active: true,
        blocked: false,
        linkedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      transaction.update(inviteRef, {
        used: true,
        usedBy: req.user.uid,
        usedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      transaction.update(patientRef, {
        linkedPsychologistId: inviteData.psychologistId,
      });
    });

    return res.json({
      message: "Paciente vinculado correctamente.",
    });
  } catch (error) {
    if (sendValidationError(res, error)) return;

    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("Error vinculando psicólogo:", error);

    return res.status(500).json({
      message: "Error vinculando psicólogo.",
    });
  }
});

router.get("/tasks", verifyToken, async (req, res) => {
  try {
    const snapshot = await db
      .collection("patientTasks")
      .where("patientId", "==", req.user.uid)
      .get();

    const tasks = snapshot.docs
      .map((doc) => {
        const data = doc.data();

        return {
          id: doc.id,
          title: data.title || "Tarea sin título",
          description: data.description || "",
          status: data.status || "pending",
          dueDate: data.dueDate || null,
          createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
          updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
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
});

router.patch("/tasks/:taskId/complete", verifyToken, async (req, res) => {
  try {
    const taskId = requireDocumentId(req.params.taskId, "La tarea");

    const taskRef = db.collection("patientTasks").doc(taskId);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      return res.status(404).json({
        message: "Tarea no encontrada.",
      });
    }

    const taskData = taskDoc.data();

    if (taskData.patientId !== req.user.uid) {
      return res.status(403).json({
        message: "No tienes acceso a esta tarea.",
      });
    }

    await taskRef.update({
      status: "completed",
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({
      message: "Tarea marcada como completada.",
    });
  } catch (error) {
    if (sendValidationError(res, error)) return;

    console.error("Error completando tarea:", error);

    return res.status(500).json({
      message: "Error completando tarea.",
    });
  }
});

module.exports = router;
