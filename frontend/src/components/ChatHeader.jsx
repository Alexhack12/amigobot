import { ShieldCheck, HeartPulse } from "lucide-react";
import "../styles/chatheader.css";

function ChatHeader() {
  return (
    <div className="chat-header">
      <div>
        <h2>AmigoBot</h2>
        <p>Espacio seguro · conversación privada</p>
      </div>

      <div className="mood-pill">
        <HeartPulse size={17} />
        Estado: neutral
      </div>

      <div className="privacy-pill">
        <ShieldCheck size={17} />
        Confidencial
      </div>
    </div>
  );
}

export default ChatHeader;