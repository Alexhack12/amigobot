const emotionLabels = {
  stress: "Estrés",
  sadness: "Tristeza",
  happiness: "Felicidad",
  stable: "Estabilidad",
  neutral: "Estabilidad",
};

const riskWeight = {
  low: 1,
  medium: 2,
  high: 3,
};

const getEmotionLabel = (emotion) => {
  return emotionLabels[emotion] || "Estabilidad";
};

const countItems = (items = []) => {
  const counts = {};

  items.forEach((item) => {
    if (!item) return;
    counts[item] = (counts[item] || 0) + 1;
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));
};

const getDominantEmotion = (conversations = []) => {
  const emotions = conversations.map(
    (conversation) => conversation.dominantEmotion || "stable"
  );

  const [dominant] = countItems(emotions);

  return dominant || {
    label: "stable",
    count: 0,
  };
};

const getHighestRisk = (conversations = []) => {
  return conversations.reduce(
    (highest, conversation) => {
      const currentRisk = conversation.riskLevel || "low";

      if (riskWeight[currentRisk] > riskWeight[highest]) {
        return currentRisk;
      }

      return highest;
    },
    "low"
  );
};

const getEmotionTimeline = (conversations = []) => {
  return conversations
    .slice()
    .reverse()
    .map((conversation, index) => ({
      session: index + 1,
      emotion: conversation.dominantEmotion || "stable",
      emotionLabel: getEmotionLabel(conversation.dominantEmotion),
      riskLevel: conversation.riskLevel || "low",
      title: conversation.title || "Conversación",
      date: conversation.updatedAt || null,
      trend: conversation.trend || "",
      behaviorChange: conversation.behaviorChange || "",
    }));
};

const getTrendStatus = (conversations = []) => {
  if (conversations.length < 2) {
    return {
      label: "Sin tendencia suficiente",
      description:
        "Aún no hay conversaciones suficientes para establecer una tendencia.",
    };
  }

  const recent = conversations.slice(0, 3);
  const stressCount = recent.filter(
    (conversation) => conversation.dominantEmotion === "stress"
  ).length;
  const sadnessCount = recent.filter(
    (conversation) => conversation.dominantEmotion === "sadness"
  ).length;
  const happinessCount = recent.filter(
    (conversation) => conversation.dominantEmotion === "happiness"
  ).length;
  const highRisk = recent.some((conversation) => conversation.riskLevel === "high");
  const mediumRisk = recent.some(
    (conversation) => conversation.riskLevel === "medium"
  );

  if (highRisk) {
    return {
      label: "Atención prioritaria",
      description:
        "Se detectan indicadores de riesgo alto en conversaciones recientes. Se recomienda valoración profesional inmediata.",
    };
  }

  if (mediumRisk) {
    return {
      label: "Seguimiento cercano",
      description:
        "Se observan indicadores de malestar o riesgo medio. Se recomienda seguimiento cercano.",
    };
  }

  if (stressCount >= 2) {
    return {
      label: "Estrés persistente",
      description:
        "El estrés aparece de forma repetida en las conversaciones recientes.",
    };
  }

  if (sadnessCount >= 2) {
    return {
      label: "Tristeza persistente",
      description:
        "La tristeza aparece de forma repetida en las conversaciones recientes.",
    };
  }

  if (happinessCount >= 2) {
    return {
      label: "Mejoría conductual",
      description:
        "Se observa repetición de emociones positivas o señales de avance reciente.",
    };
  }

  return {
    label: "Variación emocional",
    description:
      "Las emociones han cambiado entre sesiones. Se recomienda revisar qué factores explican esos cambios.",
  };
};

const getAllFactors = (conversations = []) => {
  return conversations.flatMap(
    (conversation) => conversation.influencingFactors || []
  );
};

const getAllBehaviorSignals = (conversations = []) => {
  return conversations.flatMap(
    (conversation) => conversation.behaviorSignals || []
  );
};

const getRepeatedFactors = (conversations = []) => {
  return countItems(getAllFactors(conversations)).filter(
    (factor) => factor.count >= 2
  );
};

const getEmergingFactors = (conversations = []) => {
  if (conversations.length === 0) return [];

  const latest = conversations[0];
  const previous = conversations.slice(1);

  const previousFactors = new Set(getAllFactors(previous));

  return (latest.influencingFactors || [])
    .filter((factor) => !previousFactors.has(factor))
    .map((factor) => ({
      label: factor,
      count: 1,
    }));
};

const getTaskStats = (tasks = []) => {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.status === "completed").length;
  const pending = total - completed;

  return {
    total,
    completed,
    pending,
    completionRate: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
};

const generateClinicalNarrative = ({
  conversations,
  dominantEmotion,
  highestRisk,
  repeatedFactors,
  emergingFactors,
  behaviorSignals,
  trendStatus,
  taskStats,
}) => {
  if (conversations.length === 0) {
    return "Aún no hay información suficiente para generar una lectura global del paciente.";
  }

  const factorText =
    repeatedFactors.length > 0
      ? repeatedFactors.map((factor) => factor.label).join(", ")
      : "factores no suficientemente repetidos";

  const emergingText =
    emergingFactors.length > 0
      ? emergingFactors.map((factor) => factor.label).join(", ")
      : "sin factores emergentes claros";

  const behaviorText =
    behaviorSignals.length > 0
      ? behaviorSignals
          .slice(0, 4)
          .map((signal) => signal.label)
          .join(", ")
      : "sin señales conductuales repetidas suficientes";

  return `Durante las conversaciones recientes predomina ${getEmotionLabel(
    dominantEmotion.label
  ).toLowerCase()}. La tendencia general se clasifica como "${
    trendStatus.label
  }": ${trendStatus.description} Los factores más repetidos son ${factorText}. Los factores emergentes son ${emergingText}. Las señales conductuales más observadas son ${behaviorText}. El nivel máximo de riesgo registrado es ${highestRisk}. En tareas asignadas se registra ${taskStats.completed} completada(s) de ${taskStats.total}. Este resumen no constituye diagnóstico y debe interpretarse como apoyo para seguimiento profesional.`;
};

const generateClinicalSummary = ({ patient, conversations = [], tasks = [] }) => {
  const sortedConversations = conversations
    .slice()
    .sort((a, b) => {
      if (!a.updatedAt) return 1;
      if (!b.updatedAt) return -1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    })
    .slice(0, 5);

  const dominantEmotion = getDominantEmotion(sortedConversations);
  const highestRisk = getHighestRisk(sortedConversations);
  const trendStatus = getTrendStatus(sortedConversations);

  const factors = countItems(getAllFactors(sortedConversations));
  const behaviorSignals = countItems(getAllBehaviorSignals(sortedConversations));
  const repeatedFactors = getRepeatedFactors(sortedConversations);
  const emergingFactors = getEmergingFactors(sortedConversations);
  const emotionTimeline = getEmotionTimeline(sortedConversations);
  const taskStats = getTaskStats(tasks);

  const narrative = generateClinicalNarrative({
    conversations: sortedConversations,
    dominantEmotion,
    highestRisk,
    repeatedFactors,
    emergingFactors,
    behaviorSignals,
    trendStatus,
    taskStats,
  });

  return {
    patient: {
      id: patient?.patientId || patient?.id || null,
      name: patient?.patientName || patient?.name || "Paciente sin nombre",
      email: patient?.patientEmail || patient?.email || "Correo no disponible",
    },
    generatedAt: new Date().toISOString(),
    totalSessions: sortedConversations.length,
    dominantEmotion: {
      key: dominantEmotion.label,
      label: getEmotionLabel(dominantEmotion.label),
      count: dominantEmotion.count,
    },
    highestRisk,
    trendStatus,
    factors,
    repeatedFactors,
    emergingFactors,
    behaviorSignals,
    emotionTimeline,
    taskStats,
    latestConversation: sortedConversations[0] || null,
    narrative,
  };
};

module.exports = {
  generateClinicalSummary,
};