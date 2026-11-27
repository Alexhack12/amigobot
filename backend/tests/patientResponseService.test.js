const test = require("node:test");
const assert = require("node:assert/strict");
const {
  serializeChatReply,
  serializePatientConversation,
  serializePatientMessage,
} = require("../services/patientResponseService");

const documentWith = (id, data) => ({ id, data: () => data });

test("las respuestas del paciente excluyen análisis conductual interno", () => {
  const sensitive = {
    title: "Seguimiento",
    text: "Respuesta segura",
    sender: "assistant",
    summary: "resumen interno",
    riskLevel: "high",
    emotion: "sadness",
    recommendations: ["dato interno"],
    behaviorSignals: ["dato interno"],
  };

  const conversation = serializePatientConversation(
    documentWith("conversation-1", sensitive)
  );
  const message = serializePatientMessage(documentWith("message-1", sensitive));
  const reply = serializeChatReply(
    { reply: "Respuesta segura", ...sensitive },
    "Seguimiento"
  );

  for (const value of [conversation, message, reply]) {
    const serialized = JSON.stringify(value);
    assert.doesNotMatch(serialized, /summary|riskLevel|recommendations|behaviorSignals/);
    assert.doesNotMatch(serialized, /resumen interno|dato interno/);
  }
});

test("normaliza remitentes y no expone campos adicionales del mensaje", () => {
  const message = serializePatientMessage(
    documentWith("message-2", {
      sender: "assistant",
      text: "Hola",
      userId: "private-user-id",
      conversationId: "private-conversation-id",
    })
  );

  assert.deepEqual(message, {
    id: "message-2",
    sender: "bot",
    text: "Hola",
    createdAt: null,
  });
});
