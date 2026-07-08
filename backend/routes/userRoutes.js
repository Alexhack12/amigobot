const express = require("express");
const { db, admin } = require("../firebase/firebaseAdmin");
const { verifyToken } = require("../middleware/authMiddleware");

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

    return res.json({
      id: userDoc.id,
      ...userDoc.data(),
    });
  } catch (error) {
    console.error("Error obteniendo usuario:", error);

    return res.status(500).json({
      message: "Error obteniendo usuario",
    });
  }
});

router.post("/sync", verifyToken, async (req, res) => {
  try {
    const { name, role, cedula } = req.body;

    const safeRole = role === "psychologist" ? "psychologist" : "patient";

    const userData = {
      uid: req.user.uid,
      email: req.user.email,
      name: name || req.user.name || "Usuario",
      role: safeRole,
      cedula: safeRole === "psychologist" ? cedula || null : null,
      verificationStatus: safeRole === "psychologist" ? "pending" : "approved",
      blocked: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("users").doc(req.user.uid).set(userData, {
      merge: true,
    });

    return res.json({
      message: "Usuario sincronizado",
      user: userData,
    });
  } catch (error) {
    console.error("Error sincronizando usuario:", error);

    return res.status(500).json({
      message: "Error sincronizando usuario",
    });
  }
});

router.post("/link-psychologist", verifyToken, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        message: "Código requerido.",
      });
    }

    const inviteRef = db.collection("invitationCodes").doc(code.toUpperCase());
    const inviteDoc = await inviteRef.get();

    if (!inviteDoc.exists) {
      return res.status(404).json({
        message: "Código inválido.",
      });
    }

    const inviteData = inviteDoc.data();

    if (inviteData.used) {
      return res.status(400).json({
        message: "Este código ya fue utilizado.",
      });
    }

    const patientRef = db.collection("users").doc(req.user.uid);
    const patientDoc = await patientRef.get();

    if (!patientDoc.exists) {
      return res.status(404).json({
        message: "Paciente no encontrado.",
      });
    }

    const patientData = patientDoc.data();

    if (patientData.role !== "patient") {
      return res.status(403).json({
        message: "Solo los pacientes pueden vincularse con un psicólogo.",
      });
    }

    await db.collection("psychologistPatients").add({
      psychologistId: inviteData.psychologistId,
      patientId: req.user.uid,
      patientName: patientData.name || "Paciente",
      patientEmail: patientData.email || req.user.email,
      active: true,
      blocked: false,
      linkedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await inviteRef.update({
      used: true,
      usedBy: req.user.uid,
      usedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await patientRef.update({
      linkedPsychologistId: inviteData.psychologistId,
      blocked: false,
    });

    return res.json({
      message: "Paciente vinculado correctamente.",
    });
  } catch (error) {
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
    const { taskId } = req.params;

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
    console.error("Error completando tarea:", error);

    return res.status(500).json({
      message: "Error completando tarea.",
    });
  }
});

module.exports = router;