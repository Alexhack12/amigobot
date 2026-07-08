import { useState } from "react";
import { SendHorizontal } from "lucide-react";
import "../styles/chatinput.css";

function ChatInput({ onSendMessage }) {
  const [message, setMessage] = useState("");

  const handleSubmit = () => {
    if (message.trim() === "") return;

    onSendMessage(message);
    setMessage("");
  };

  return (
    <div className="chat-input-container">
      <input
        type="text"
        placeholder="Escribe cómo te sientes..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
        }}
      />

      <button onClick={handleSubmit}>
        <SendHorizontal size={20} />
      </button>
    </div>
  );
}

export default ChatInput;