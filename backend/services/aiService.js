const normalizeText = (message = "") =>
  String(message)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const behavioralDictionary = {
  stress: {
    label: "estrés",
    words: [
      "estres", "presion", "saturado", "agobiado", "agotado", "cansado",
      "examen", "tarea", "escuela", "universidad", "proyecto", "pendiente",
      "trabajo", "jefe", "no me alcanza el tiempo", "mucho que hacer",
    ],
    behaviorSignals: [
      "sobrecarga de responsabilidades",
      "dificultad para organizar pendientes",
      "cansancio o baja recuperación",
    ],
  },
  sadness: {
    label: "tristeza",
    words: [
      "triste", "solo", "sola", "llorar", "vacio", "sin ganas",
      "desanimado", "deprimido", "me duele", "extrano", "perdi",
      "no quiero hacer nada",
    ],
    behaviorSignals: [
      "baja motivación",
      "posible aislamiento",
      "disminución de energía o actividad",
    ],
  },
  happiness: {
    label: "felicidad",
    words: [
      "feliz", "contento", "bien", "tranquilo", "motivado", "logre",
      "pude", "me gusto", "me siento mejor", "orgulloso", "avance",
    ],
    behaviorSignals: [
      "mayor activación positiva",
      "percepción de logro",
      "mejor disposición para actividades",
    ],
  },
};

const factorDictionary = [
  {
    label: "Escuela / carga académica",
    words: ["escuela", "clase", "tarea", "examen", "profe", "maestro", "universidad", "proyecto"],
  },
  {
    label: "Trabajo / responsabilidades",
    words: ["trabajo", "jefe", "turno", "dinero", "negocio", "responsabilidad", "pendiente"],
  },
  {
    label: "Familia / hogar",
    words: ["familia", "mama", "papa", "hermano", "hermana", "casa", "hogar"],
  },
  {
    label: "Relaciones / vínculo social",
    words: ["novio", "novia", "pareja", "amigo", "amiga", "relacion", "pelea", "me dejo"],
  },
  {
    label: "Sueño / descanso",
    words: ["dormir", "sueno", "insomnio", "desvelo", "cansado", "agotado", "duermo mal"],
  },
  {
    label: "Salud / cuerpo",
    words: ["dolor", "enfermo", "medico", "hospital", "cuerpo", "comer", "apetito"],
  },
];

const scoreEmotion = (text, emotionKey) => {
  const emotion = behavioralDictionary[emotionKey];
  return emotion.words.reduce((score, word) => {
    return text.includes(normalizeText(word)) ? score + 1 : score;
  }, 0);
};

const detectEmotion = (message) => {
  const text = normalizeText(message);

  const scores = {
    stress: scoreEmotion(text, "stress"),
    sadness: scoreEmotion(text, "sadness"),
    happiness: scoreEmotion(text, "happiness"),
  };

  const [emotion, score] = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];

  return score > 0 ? emotion : "stable";
};

const detectRisk = (message) => {
  const text = normalizeText(message);

  const highRiskWords = [
    "quiero morir",
    "me quiero morir",
    "suicidio",
    "suicidarme",
    "ya no quiero vivir",
    "quiero desaparecer",
    "hacerme dano",
    "me voy a matar",
    "no quiero seguir viviendo",
  ];

  const mediumRiskWords = [
    "ya no puedo",
    "no aguanto",
    "no puedo mas",
    "me siento perdido",
    "todo esta mal",
    "me estoy quebrando",
    "me siento desesperado",
  ];

  if (highRiskWords.some((word) => text.includes(normalizeText(word)))) return "high";
  if (mediumRiskWords.some((word) => text.includes(normalizeText(word)))) return "medium";

  return "low";
};

const detectInfluencingFactors = (message) => {
  const text = normalizeText(message);

  const factors = factorDictionary
    .filter((factor) =>
      factor.words.some((word) => text.includes(normalizeText(word)))
    )
    .map((factor) => factor.label);

  return factors.length > 0 ? factors : ["Contexto personal no especificado"];
};

const detectBehaviorSignals = (message, emotion) => {
  const text = normalizeText(message);
  const signals = new Set();

  if (behavioralDictionary[emotion]) {
    behavioralDictionary[emotion].behaviorSignals.forEach((signal) =>
      signals.add(signal)
    );
  }

  if (
    text.includes("no salgo") ||
    text.includes("me aisle") ||
    text.includes("me aleje") ||
    text.includes("no quiero ver a nadie")
  ) {
    signals.add("reducción de convivencia o actividades sociales");
  }

  if (
    text.includes("no duermo") ||
    text.includes("duermo mal") ||
    text.includes("insomnio") ||
    text.includes("me desvelo")
  ) {
    signals.add("alteración del sueño");
  }

  if (
    text.includes("no como") ||
    text.includes("sin apetito") ||
    text.includes("como mucho")
  ) {
    signals.add("cambio en alimentación o apetito");
  }

  if (
    text.includes("no hice") ||
    text.includes("pospuse") ||
    text.includes("procrastine") ||
    text.includes("evite")
  ) {
    signals.add("evitación o aplazamiento de actividades");
  }

  if (
    text.includes("camine") ||
    text.includes("hice ejercicio") ||
    text.includes("termine") ||
    text.includes("logre") ||
    text.includes("avance")
  ) {
    signals.add("conducta de afrontamiento o avance positivo");
  }

  return Array.from(signals).slice(0, 5);
};

const getEmotionLabel = (emotion) => {
  const labels = {
    stress: "estrés",
    sadness: "tristeza",
    happiness: "felicidad",
    stable: "estabilidad emocional",
  };

  return labels[emotion] || "estabilidad emocional";
};

const detectTrendFromMemory = (memoryContext = [], currentEmotion, currentFactors = []) => {
  const memoryText = normalizeText(memoryContext.join(" "));

  const previousStress = (memoryText.match(/stress|estres/g) || []).length;
  const previousSadness = (memoryText.match(/sadness|tristeza/g) || []).length;
  const previousHappiness = (memoryText.match(/happiness|felicidad/g) || []).length;

  let trend = "No hay suficientes conversaciones previas para establecer una tendencia sólida.";

  if (memoryContext.length > 0) {
    if (currentEmotion === "stress" && previousStress >= 1) {
      trend = "El estrés aparece como patrón repetido en conversaciones recientes.";
    } else if (currentEmotion === "sadness" && previousSadness >= 1) {
      trend = "La tristeza aparece como patrón repetido en conversaciones recientes.";
    } else if (currentEmotion === "happiness" && previousHappiness >= 1) {
      trend = "Se observa continuidad de activación positiva o mejoría reciente.";
    } else {
      trend = "Se observa un cambio emocional respecto a conversaciones previas.";
    }
  }

  const currentFactorText = normalizeText(currentFactors.join(" "));
  const repeatedFactors = currentFactors.filter((factor) =>
    memoryText.includes(normalizeText(factor))
  );

  const emergingFactors = currentFactors.filter(
    (factor) => !memoryText.includes(normalizeText(factor))
  );

  return {
    trend,
    repeatedFactors,
    emergingFactors,
  };
};

const createBehaviorChange = ({ emotion, behaviorSignals, riskLevel, trendData }) => {
  if (riskLevel === "high") {
    return "Se detectan señales de riesgo que requieren valoración profesional inmediata antes de interpretar cambios conductuales.";
  }

  const trendPhrase = trendData?.trend ? ` ${trendData.trend}` : "";

  if (emotion === "happiness") {
    return `El paciente muestra señales de mejoría conductual: mayor disposición, logro o activación positiva.${trendPhrase}`;
  }

  if (emotion === "stress") {
    return `El paciente muestra aumento de presión conductual: posible saturación, cansancio o dificultad para organizar actividades.${trendPhrase}`;
  }

  if (emotion === "sadness") {
    return `El paciente muestra posible disminución de activación: baja motivación, aislamiento o necesidad de apoyo.${trendPhrase}`;
  }

  if (behaviorSignals.length > 0) {
    return `Se observaron señales conductuales relevantes: ${behaviorSignals.join(", ")}.${trendPhrase}`;
  }

  return `No se observa un cambio conductual claro en este mensaje. ${trendPhrase}`;
};

const createSummary = ({
  message,
  emotion,
  riskLevel,
  factors,
  behaviorSignals,
  behaviorChange,
  trendData,
}) => {
  let summary = `Lectura conductual: predomina ${getEmotionLabel(emotion)}. ${behaviorChange}`;

  summary += ` Factores asociados: ${factors.join(", ")}.`;

  if (trendData?.repeatedFactors?.length > 0) {
    summary += ` Factores repetidos: ${trendData.repeatedFactors.join(", ")}.`;
  }

  if (trendData?.emergingFactors?.length > 0) {
    summary += ` Factores emergentes: ${trendData.emergingFactors.join(", ")}.`;
  }

  if (behaviorSignals.length > 0) {
    summary += ` Señales observables: ${behaviorSignals.join(", ")}.`;
  }

  if (riskLevel === "medium") {
    summary += " Se recomienda seguimiento cercano.";
  }

  if (riskLevel === "high") {
    summary += " Se recomienda intervención profesional inmediata y revisión de red de apoyo.";
  }

  summary += ` Mensaje base: "${message}".`;

  return summary;
};

const createRecommendations = (emotion, riskLevel, trendData) => {
  if (riskLevel === "high") {
    return [
      "Contactar al paciente lo antes posible.",
      "Valorar riesgo inmediato, plan de seguridad y red de apoyo.",
      "Canalizar a emergencias si existe peligro actual.",
      "Registrar seguimiento profesional prioritario.",
    ];
  }

  if (riskLevel === "medium") {
    return [
      "Dar seguimiento cercano en la próxima sesión.",
      "Explorar detonantes recientes del cambio conductual.",
      "Revisar sueño, alimentación, rutina y apoyo social.",
      "Asignar una tarea breve, observable y medible.",
    ];
  }

  if (trendData?.emergingFactors?.length > 0) {
    return [
      `Explorar el nuevo factor asociado: ${trendData.emergingFactors.join(", ")}.`,
      "Comparar cambios de conducta entre la sesión previa y la actual.",
      "Asignar una tarea breve para observar frecuencia, intensidad o contexto.",
      "Revisar si el factor emergente está modificando sueño, rutina o convivencia.",
    ];
  }

  if (emotion === "stress") {
    return [
      "Identificar responsabilidades que aumentan la presión.",
      "Dividir tareas en acciones pequeñas y medibles.",
      "Revisar descanso y pausas durante la semana.",
      "Registrar situaciones que disparan mayor estrés.",
    ];
  }

  if (emotion === "sadness") {
    return [
      "Explorar cambios recientes en rutina y convivencia.",
      "Proponer una actividad breve de activación conductual.",
      "Revisar red de apoyo y frecuencia de aislamiento.",
      "Monitorear sueño, apetito y motivación.",
    ];
  }

  if (emotion === "happiness") {
    return [
      "Reforzar conductas que favorecieron la mejoría.",
      "Identificar factores que influyeron positivamente.",
      "Mantener registro de actividades útiles.",
      "Usar el avance como punto de apoyo terapéutico.",
    ];
  }

  return [
    "Continuar monitoreando cambios de conducta.",
    "Explorar contexto y factores asociados.",
    "Asignar una tarea breve de registro semanal.",
  ];
};

const createReply = (emotion, riskLevel, memoryContext = [], trendData) => {
  const memoryPrefix =
    memoryContext.length > 0 ? "Tomando en cuenta lo que has contado antes, " : "";

  if (riskLevel === "high") {
    return "Siento mucho que estés pasando por esto. No tienes que enfrentarlo solo. Busca ayuda inmediata con alguien de confianza o con un profesional. Si estás en peligro ahora, llama a emergencias de tu país.";
  }

  if (riskLevel === "medium") {
    return `${memoryPrefix}quiero que vayamos paso a paso. ¿Qué cambió estos días en tu sueño, apetito, rutina, ganas de hacer cosas o convivencia?`;
  }

  if (trendData?.emergingFactors?.length > 0) {
    return `${memoryPrefix}noto que ahora aparece algo importante relacionado con ${trendData.emergingFactors.join(", ")}. ¿Qué cambió en tu conducta desde que eso empezó a influir?`;
  }

  if (emotion === "stress") {
    return `${memoryPrefix}suena a que hay mucha presión afectando tu conducta. ¿Qué parte de tu rutina se está alterando más: sueño, tareas, descanso o convivencia?`;
  }

  if (emotion === "sadness") {
    return `${memoryPrefix}parece que esto te está bajando energía o ganas. ¿Has notado si te estás aislando, durmiendo distinto o dejando actividades?`;
  }

  if (emotion === "happiness") {
    return `${memoryPrefix}me alegra leer eso. Para entender qué está funcionando, ¿qué hiciste diferente y qué te ayudó a sentirte mejor?`;
  }

  return `${memoryPrefix}te leo. Para entenderlo mejor, dime qué cambió últimamente en tu conducta: sueño, apetito, rutina, estudio/trabajo o convivencia.`;
};

const buildSystemPrompt = () => `
Eres AmigoBot, un asistente de apoyo emocional para una plataforma usada por pacientes y psicólogos.

Reglas obligatorias:
- No diagnostiques.
- No digas que eres terapeuta.
- No sustituyes atención profesional.
- No uses etiquetas clínicas con el paciente.
- No afirmes certezas que no puedas saber.
- Responde en español mexicano natural, cálido y breve.
- Centra tus respuestas en conducta observable: sueño, apetito, rutina, convivencia, energía, tareas, evitación y acciones.
- Usa emociones simples: estrés, tristeza, felicidad o estabilidad.
- Identifica factores que influyen: escuela, trabajo, familia, relaciones, sueño, salud o contexto no especificado.
- Si hay riesgo alto, prioriza seguridad, red de apoyo y ayuda inmediata.
- Haz una sola pregunta útil al final.
- Evita respuestas largas.
`;

const analyzeMessage = async (message, memoryContext = []) => {
  const emotion = detectEmotion(message);
  const riskLevel = detectRisk(message);
  const factors = detectInfluencingFactors(message);
  const behaviorSignals = detectBehaviorSignals(message, emotion);
  const trendData = detectTrendFromMemory(memoryContext, emotion, factors);

  const behaviorChange = createBehaviorChange({
    emotion,
    behaviorSignals,
    riskLevel,
    trendData,
  });

  const summary = createSummary({
    message,
    emotion,
    riskLevel,
    factors,
    behaviorSignals,
    behaviorChange,
    trendData,
  });

  const recommendations = createRecommendations(emotion, riskLevel, trendData);
  const fallbackReply = createReply(emotion, riskLevel, memoryContext, trendData);

  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return {
        reply: fallbackReply,
        emotion,
        riskLevel,
        summary,
        recommendations,
        factors,
        behaviorSignals,
        behaviorChange,
        trend: trendData.trend,
        repeatedFactors: trendData.repeatedFactors,
        emergingFactors: trendData.emergingFactors,
      };
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content: buildSystemPrompt(),
          },
          {
            role: "system",
            content: `Memoria conductual de conversaciones previas: ${
              memoryContext.join(" | ") || "sin memoria previa"
            }`,
          },
          {
            role: "system",
            content: `Análisis interno actual:
Emoción detectada: ${emotion}
Riesgo: ${riskLevel}
Factores: ${factors.join(", ")}
Señales conductuales: ${behaviorSignals.join(", ") || "sin señales claras"}
Tendencia: ${trendData.trend}
Factores repetidos: ${trendData.repeatedFactors.join(", ") || "ninguno"}
Factores emergentes: ${trendData.emergingFactors.join(", ") || "ninguno"}

Responde al paciente usando estos datos, pero sin sonar clínico ni diagnóstico.`,
          },
          {
            role: "user",
            content: message,
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Error OpenAI:", data);
      throw new Error(data.error?.message || "Error en OpenAI");
    }

    const reply =
      data.output_text ||
      data.output?.[0]?.content?.[0]?.text ||
      fallbackReply;

    return {
      reply,
      emotion,
      riskLevel,
      summary,
      recommendations,
      factors,
      behaviorSignals,
      behaviorChange,
      trend: trendData.trend,
      repeatedFactors: trendData.repeatedFactors,
      emergingFactors: trendData.emergingFactors,
    };
  } catch (error) {
    console.error("Error en IA:", error);

    return {
      reply: fallbackReply,
      emotion,
      riskLevel,
      summary,
      recommendations,
      factors,
      behaviorSignals,
      behaviorChange,
      trend: trendData.trend,
      repeatedFactors: trendData.repeatedFactors,
      emergingFactors: trendData.emergingFactors,
    };
  }
};

module.exports = {
  analyzeMessage,
};