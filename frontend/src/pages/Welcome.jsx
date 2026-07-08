import "../styles/welcome.css";
import { ShieldCheck, HeartHandshake, Brain } from "lucide-react";

import { useNavigate } from "react-router-dom";
function Welcome() {

  const navigate = useNavigate();
  return (
    <div className="welcome-page">

      <div className="welcome-card">

        <h1>Bienvenido a AmigoBot</h1>

        <p className="subtitle">
          Un espacio seguro para hablar, reflexionar y recibir apoyo emocional.
        </p>

        <div className="features">

          <div className="feature">
            <ShieldCheck size={22} />
            <span>Conversaciones privadas y confidenciales</span>
          </div>

          <div className="feature">
            <HeartHandshake size={22} />
            <span>AmigoBot escucha sin juzgar</span>
          </div>

          <div className="feature">
            <Brain size={22} />
            <span>
              Se pueden detectar tendencias emocionales para apoyo profesional
            </span>
          </div>

        </div>

        <div className="warning-box">
          AmigoBot no reemplaza atención psicológica profesional ni realiza diagnósticos médicos.
        </div>

      <button onClick={() => navigate("/login")}>
  Acepto y continuar
</button>
      </div>

    </div>
  );
}

export default Welcome;