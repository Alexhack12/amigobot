import { useEffect, useState } from "react";
import { MessageSquarePlus, Settings, User, ClipboardPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../services/firebase";
import "../styles/sidebar.css";

function Sidebar({ chats, activeChatId, onSelectChat, onNewChat }) {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState("patient");
  const [verificationStatus, setVerificationStatus] = useState("approved");

  useEffect(() => {
    const loadUserRole = async () => {
      try {
        const currentUser = auth.currentUser;

        if (!currentUser) return;

        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          setUserRole(data.role || "patient");
          setVerificationStatus(data.verificationStatus || "approved");
        }
      } catch (error) {
        console.error("Error cargando rol en sidebar:", error);
      }
    };

    loadUserRole();
  }, []);

  const getDashboardLabel = () => {
    if (userRole === "psychologist" && verificationStatus === "approved") {
      return "Panel psicólogo";
    }

    if (userRole === "psychologist" && verificationStatus === "pending") {
      return "Cuenta en revisión";
    }

    if (userRole === "admin") {
      return "Panel admin";
    }

    return "Mi espacio";
  };

  return (
    <div className="sidebar">
      <div className="sidebar-top">
        <h1 className="logo">AmigoBot</h1>

        <button className="new-chat" onClick={onNewChat}>
          <MessageSquarePlus size={18} />
          Nuevo chat
        </button>
      </div>

      <div className="chat-list">
        {chats.map((chat) => (
          <div
            key={chat.id}
            className={`chat-item ${chat.id === activeChatId ? "active" : ""}`}
            onClick={() => onSelectChat(chat.id)}
          >
            {chat.title}
          </div>
        ))}
      </div>

      <div className="sidebar-bottom">
        <button className="sidebar-btn" onClick={() => navigate("/profile")}>
          <User size={18} />
          Perfil
        </button>

        <button className="sidebar-btn" onClick={() => navigate("/dashboard")}>
          <ClipboardPlus size={18} />
          {getDashboardLabel()}
        </button>

        <button className="sidebar-btn" onClick={() => navigate("/settings")}>
          <Settings size={18} />
          Configuración
        </button>
      </div>
    </div>
  );
}

export default Sidebar;