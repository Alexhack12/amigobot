import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ShieldCheck, Moon, LogOut, Brain } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";
import "../styles/settings.css";

function Settings() {
  const navigate = useNavigate();

const [settings, setSettings] = useState(() => {
  const savedSettings = localStorage.getItem("amigobot-settings");

  return savedSettings
    ? JSON.parse(savedSettings)
    : {
        notifications: true,
        privacy: true,
        memory: true,
        darkMode: true,
      };
});
  

  useEffect(() => {
    localStorage.setItem("amigobot-settings", JSON.stringify(settings));

    if (settings.darkMode) {
      document.body.classList.remove("light-mode");
    } else {
      document.body.classList.add("light-mode");
    }
  }, [settings]);

  const toggleSetting = (key) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-card">
        <button className="settings-back" onClick={() => navigate("/chat")}>
          Volver al chat
        </button>

        <div className="settings-header">
          <h1>Configuración</h1>
          <p>Ajustes generales de privacidad, notificaciones y experiencia.</p>
        </div>

        <div className="settings-list">
          <SettingItem
            icon={<Bell size={22} />}
            title="Notificaciones"
            text={
              settings.notifications
                ? "AmigoBot podrá enviarte recordatorios de seguimiento."
                : "AmigoBot no enviará recordatorios ni avisos de seguimiento."
            }
            checked={settings.notifications}
            onChange={() => toggleSetting("notifications")}
          />

          <SettingItem
            icon={<ShieldCheck size={22} />}
            title="Privacidad"
            text={
              settings.privacy
                ? "El análisis emocional está permitido para apoyo profesional."
                : "El análisis emocional está desactivado y no se mostrará en el panel."
            }
            checked={settings.privacy}
            onChange={() => toggleSetting("privacy")}
          />

          <SettingItem
            icon={<Brain size={22} />}
            title="Memoria conversacional"
            text={
              settings.memory
                ? "AmigoBot podrá usar contexto de conversaciones anteriores."
                : "AmigoBot no usará recuerdos ni contexto anterior."
            }
            checked={settings.memory}
            onChange={() => toggleSetting("memory")}
          />

          <SettingItem
            icon={<Moon size={22} />}
            title="Modo oscuro"
            text={
              settings.darkMode
                ? "Interfaz oscura activada."
                : "Interfaz clara activada."
            }
            checked={settings.darkMode}
            onChange={() => toggleSetting("darkMode")}
          />
        </div>

        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

function SettingItem({ icon, title, text, checked, onChange }) {
  return (
    <div className="settings-item">
      <div className="settings-icon">{icon}</div>

      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>

      <label className="switch">
        <input type="checkbox" checked={checked} onChange={onChange} />
        <span className="slider"></span>
      </label>
    </div>
  );
}

export default Settings;