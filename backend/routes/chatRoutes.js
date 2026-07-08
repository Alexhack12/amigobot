const express = require("express");
const { db, admin } = require("../firebase/firebaseAdmin");
const { verifyToken } = require("../middleware/authMiddleware");
const { analyzeMessage } = require("../services/aiService");

const router = express.Router();

const emotionLabels = {
  stress: "Estrés",
  sadness: "Tristeza",
  happiness: "Felicidad",
  stable: "Estabilidad",
};

const getConversationTitle = (message, emotion = "stable") => {
  const text = message.toLowerCase();

  if (
    text.includes("examen") ||
    text.includes("escuela") ||
    text.includes("profe") ||
    text.includes("tarea") ||
    text.includes("universidad")
  ) {
    return "Conducta académica";
  }

  if (
    text.includes("trabajo") ||
    text.includes("jefe") ||
    text.includes("dinero") ||
    text.includes("negocio")
  ) {
    return "Conducta laboral";
  }

  if (
    text.includes("familia") ||
    text.includes("mamá") ||
    text.includes("mama") ||
    text.includes("papá") ||
    text.includes("papa")
  ) {
    return "Conducta familiar";
  }

  if (
    text.includes("novia") ||
    text.includes("novio") ||
    text.includes("pareja") ||
    text.includes("amigo") ||
    text.includes("amiga")
  ) {
    return "Vínculo social";
  }

  return `Seguimiento: ${emotionLabels[emotion] || "Conducta"}`;
};

const getMemoryContext = async (userId, currentConversationId) => {
  const snapshot = await db
    .collection("conversations")
    .where("userId", "==", userId)
    .get();

  return snapshot.docs
    .filter((doc) => doc.id !== currentConversationId)
    .map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        summary: data.summary || "",
        dominantEmotion: data.dominantEmotion || "stable",
        riskLevel: data.riskLevel || "low",
        behaviorChange: data.behaviorChange || "",
        influencingFactors: data.influencingFactors || [],
        trend: data.trend || "",
        repeatedFactors: data.repeatedFactors || [],
        emergingFactors: data.emergingFactors || [],
        updatedAt: data.updatedAt ? data.updatedAt.toDate() : null,
      };
    })
    .filter((item) => item.summary)
    .sort((a, b) => {
      if (!a.updatedAt) return 1;
      if (!b.updatedAt) return -1;
      return b.updatedAt - a.updatedAt;
    })
    .slice(0, 5)
    .map((item) => {
      const factors =
        item.influencingFactors.length > 0
          ? item.influencingFactors.join(", ")
          : "sin factores registrados";

      return `Emoción: ${item.dominantEmotion}. Riesgo: ${item.riskLevel}. Cambio conductual: ${
        item.behaviorChange || "sin cambio registrado"
      }. Factores: ${factors}. Tendencia previa: ${
        item.trend || "sin tendencia registrada"
      }. Factores repetidos: ${
        item.repeatedFactors?.join(", ") || "ninguno"
      }. Factores emergentes: ${
        item.emergingFactors?.join(", ") || "ninguno"
      }. Resumen: ${item.summary}`;
    });
};

const checkUserBlocked = async (userId) => {
  const userDoc = await db.collection("users").doc(userId).get();

  if (!userDoc.exists) {
    return {
      blocked: false,
    };
  }

  const userData = userDoc.data();

  return {
    blocked: Boolean(userData.blocked),
    blockedByPsychologistId: userData.blockedByPsychologistId || null,
  };
};

router.post("/conversations", verifyToken, async (req, res) => {
  try {
    const blockStatus = await checkUserBlocked(req.user.uid);

    if (blockStatus.blocked) {
      return res.status(403).json({
        message:
          "Tu acceso al chat está bloqueado temporalmente. Contacta a tu psicólogo.",
      });
    }

    const conversationRef = await db.collection("conversations").add({
      userId: req.user.uid,
      title: "Nueva conversación",
      messageCount: 0,
      dominantEmotion: "stable",
      riskLevel: "low",
      summary: "Conversación iniciada. Aún no hay suficiente información.",
      behaviorChange: "Sin cambios conductuales registrados.",
      behaviorSignals: [],
      influencingFactors: [],
      trend: "Sin tendencia registrada.",
      repeatedFactors: [],
      emergingFactors: [],
      recommendations: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({
      id: conversationRef.id,
      title: "Nueva conversación",
      messages: [
        {
          sender: "bot",
          text: "Hola, soy AmigoBot. ¿Qué te gustaría contarme hoy?",
        },
      ],
    });
  } catch (error) {
    console.error("Error creando conversación:", error);

    return res.status(500).json({
      message: "Error creando conversación.",
    });
  }
});

router.get("/conversations", verifyToken, async (req, res) => {
  try {
    const snapshot = await db
      .collection("conversations")
      .where("userId", "==", req.user.uid)
      .get();

    const conversations = snapshot.docs
      .map((doc) => {
        const data = doc.data();

        return {
          id: doc.id,
          title: data.title || "Conversación",
          summary: data.summary || "",
          dominantEmotion: data.dominantEmotion || "stable",
          riskLevel: data.riskLevel || "low",
          behaviorChange: data.behaviorChange || "",
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
          messages: [
            {
              sender: "bot",
              text:
                "Hola, soy AmigoBot. Estoy aquí para escucharte. ¿Qué ha cambiado en tu conducta últimamente?",
            },
          ],
        };
      })
      .sort((a, b) => {
        if (!a.updatedAt) return 1;
        if (!b.updatedAt) return -1;
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      });

    return res.json(conversations);
  } catch (error) {
    console.error("Error obteniendo conversaciones:", error);

    return res.status(500).json({
      message: "Error obteniendo conversaciones.",
    });
  }
});

router.post("/message", verifyToken, async (req, res) => {
  try {
    const { message, conversationId } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        message: "El mensaje no puede estar vacío.",
      });
    }

    if (!conversationId) {
      return res.status(400).json({
        message: "Falta conversationId.",
      });
    }

    const blockStatus = await checkUserBlocked(req.user.uid);

    if (blockStatus.blocked) {
      return res.status(403).json({
        message:
          "Tu acceso al chat está bloqueado temporalmente. Contacta a tu psicólogo.",
      });
    }

    const conversationRef = db.collection("conversations").doc(conversationId);
    const conversationDoc = await conversationRef.get();

    if (!conversationDoc.exists) {
      return res.status(404).json({
        message: "Conversación no encontrada.",
      });
    }

    const conversationData = conversationDoc.data();

    if (conversationData.userId !== req.user.uid) {
      return res.status(403).json({
        message: "No tienes acceso a esta conversación.",
      });
    }

    const memoryContext = await getMemoryContext(req.user.uid, conversationId);
    const aiResult = await analyzeMessage(message, memoryContext);

    await db.collection("chatMessages").add({
      userId: req.user.uid,
      conversationId,
      sender: "user",
      text: message,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await db.collection("chatMessages").add({
      userId: req.user.uid,
      conversationId,
      sender: "bot",
      text: aiResult.reply,
      emotion: aiResult.emotion,
      riskLevel: aiResult.riskLevel,
      summary: aiResult.summary,
      behaviorChange: aiResult.behaviorChange,
      behaviorSignals: aiResult.behaviorSignals || [],
      influencingFactors: aiResult.factors || [],
      trend: aiResult.trend || "",
      repeatedFactors: aiResult.repeatedFactors || [],
      emergingFactors: aiResult.emergingFactors || [],
      recommendations: aiResult.recommendations || [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const newMessageCount = (conversationData.messageCount || 0) + 1;

    const newTitle =
      conversationData.title === "Nueva conversación"
        ? getConversationTitle(message, aiResult.emotion)
        : conversationData.title;

    await conversationRef.update({
      title: newTitle,
      messageCount: newMessageCount,
      dominantEmotion: aiResult.emotion,
      riskLevel: aiResult.riskLevel,
      summary: aiResult.summary,
      behaviorChange: aiResult.behaviorChange,
      behaviorSignals: aiResult.behaviorSignals || [],
      influencingFactors: aiResult.factors || [],
      trend: aiResult.trend || "",
      repeatedFactors: aiResult.repeatedFactors || [],
      emergingFactors: aiResult.emergingFactors || [],
      recommendations: aiResult.recommendations || [],
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await db.collection("behavioralReports").add({
      userId: req.user.uid,
      conversationId,
      conversationTitle: newTitle,
      emotion: aiResult.emotion,
      riskLevel: aiResult.riskLevel,
      summary: aiResult.summary,
      behaviorChange: aiResult.behaviorChange,
      behaviorSignals: aiResult.behaviorSignals || [],
      influencingFactors: aiResult.factors || [],
      trend: aiResult.trend || "",
      repeatedFactors: aiResult.repeatedFactors || [],
      emergingFactors: aiResult.emergingFactors || [],
      recommendations: aiResult.recommendations || [],
      visibleToPatient: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({
      reply: aiResult.reply,
      conversationTitle: newTitle,
      emotion: aiResult.emotion,
      riskLevel: aiResult.riskLevel,
      summary: aiResult.summary,
      behaviorChange: aiResult.behaviorChange,
      behaviorSignals: aiResult.behaviorSignals || [],
      influencingFactors: aiResult.factors || [],
      trend: aiResult.trend || "",
      repeatedFactors: aiResult.repeatedFactors || [],
      emergingFactors: aiResult.emergingFactors || [],
      recommendations: aiResult.recommendations || [],
    });
  } catch (error) {
    console.error("Error en chat:", error);

    return res.status(500).json({
      message: "Error procesando mensaje.",
    });
  }
});

module.exports = router;