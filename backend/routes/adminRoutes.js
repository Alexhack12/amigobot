const express = require("express");
const { db, admin } = require("../firebase/firebaseAdmin");
const { verifyToken, requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/pending-psychologists", verifyToken, requireAdmin, async (req, res) => {
  try {
    const snapshot = await db
      .collection("users")
      .where("role", "==", "psychologist")
      .where("verificationStatus", "==", "pending")
      .get();

    const psychologists = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json(psychologists);
  } catch (error) {
    console.error("Error obteniendo psicólogos pendientes:", error);
    return res.status(500).json({
      message: "Error obteniendo psicólogos pendientes",
    });
  }
});

router.patch("/approve-psychologist/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const psychologistId = req.params.id;

    await db.collection("users").doc(psychologistId).update({
      verificationStatus: "approved",
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      verifiedBy: req.user.uid,
    });

    return res.json({
      message: "Psicólogo aprobado correctamente",
    });
  } catch (error) {
    console.error("Error aprobando psicólogo:", error);
    return res.status(500).json({
      message: "Error aprobando psicólogo",
    });
  }
});

router.patch("/reject-psychologist/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const psychologistId = req.params.id;

    await db.collection("users").doc(psychologistId).update({
      verificationStatus: "rejected",
      rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
      rejectedBy: req.user.uid,
    });

    return res.json({
      message: "Psicólogo rechazado correctamente",
    });
  } catch (error) {
    console.error("Error rechazando psicólogo:", error);
    return res.status(500).json({
      message: "Error rechazando psicólogo",
    });
  }
});

module.exports = router;