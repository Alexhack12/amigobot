const toIsoString = (value) => {
  if (typeof value?.toDate !== "function") return null;
  return value.toDate().toISOString();
};

const serializePatientConversation = (doc) => {
  const data = doc.data();

  return {
    id: doc.id,
    title: data.title || "Conversación",
    updatedAt: toIsoString(data.updatedAt),
    messages: [
      {
        sender: "bot",
        text:
          "Hola, soy AmigoBot. Estoy aquí para escucharte. ¿Qué ha cambiado en tu conducta últimamente?",
      },
    ],
  };
};

const serializePatientMessage = (doc) => {
  const data = doc.data();
  const sender =
    data.sender === "assistant"
      ? "bot"
      : data.sender === "patient"
        ? "user"
        : data.sender;

  return {
    id: doc.id,
    sender,
    text: typeof data.text === "string" ? data.text : "",
    createdAt: toIsoString(data.createdAt),
  };
};

const serializeChatReply = (aiResult, conversationTitle) => ({
  reply: aiResult.reply,
  conversationTitle,
});

module.exports = {
  serializeChatReply,
  serializePatientConversation,
  serializePatientMessage,
};
