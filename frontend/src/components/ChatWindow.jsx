import { useEffect, useRef, useState } from "react";
import ChatInput from "./ChatInput";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import ChatHeader from "./ChatHeader";
import { sendChatMessage } from "../services/api";
import "../styles/chatwindow.css";

function ChatWindow({ conversationId, messages, setMessages }) {
  const messagesEndRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isTyping]);

  const handleSendMessage = async (text) => {
    const userMessage = {
      sender: "user",
      text,
    };

    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setIsTyping(true);

    try {
      const data = await sendChatMessage(text, conversationId);

      const botMessage = {
        sender: "bot",
        text: data.reply || "Estoy aquí contigo. Cuéntame un poco más.",
      };

      setMessages(
        [...updatedMessages, botMessage],
        data.conversationTitle || undefined
      );
    } catch (error) {
      console.error("Error enviando mensaje:", error);

      const errorMessage = {
        sender: "bot",
        text: "Tuve un problema técnico al responder, pero puedes intentarlo de nuevo.",
      };

      setMessages([...updatedMessages, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="chat-window">
      <ChatHeader />

      <div className="messages">
        {messages.map((msg, index) => (
          <MessageBubble key={index} sender={msg.sender} text={msg.text} />
        ))}

        {isTyping && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      <ChatInput onSendMessage={handleSendMessage} />
    </div>
  );
}

export default ChatWindow;