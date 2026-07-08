import { useNavigate } from "react-router-dom";
import { User, Mail, HeartPulse, ShieldCheck } from "lucide-react";
import { auth } from "../services/firebase";
import "../styles/profile.css";

function Profile() {
  const navigate = useNavigate();
  const user = auth.currentUser;

  return (
    <div className="profile-page">
      <div className="profile-card">
        <button className="profile-back" onClick={() => navigate("/chat")}>
          Volver al chat
        </button>

        <div className="profile-header">
          <div className="profile-avatar">
            <User size={42} />
          </div>

          <div>
            <h1>{user?.displayName || "Usuario"}</h1>
            <p>Perfil personal de AmigoBot</p>
          </div>
        </div>

        <div className="profile-grid">
          <div className="profile-info-card">
            <Mail size={22} />
            <div>
              <h3>Correo</h3>
              <p>{user?.email || "correo no disponible"}</p>
            </div>
          </div>

          <div className="profile-info-card">
            <HeartPulse size={22} />
            <div>
              <h3>Estado emocional reciente</h3>
              <p>Estable con señales leves de estrés.</p>
            </div>
          </div>

          <div className="profile-info-card">
            <ShieldCheck size={22} />
            <div>
              <h3>Privacidad</h3>
              <p>Tu información será usada solo con fines de acompañamiento y seguimiento autorizado.</p>
            </div>
          </div>
        </div>

        <div className="profile-summary">
          <h2>Resumen personal</h2>
          <p>
            En esta demo, AmigoBot registra tendencias emocionales generales,
            temas recurrentes y señales de riesgo sin realizar diagnósticos.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Profile;