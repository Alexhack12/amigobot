import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  linkPsychologist,
  getMyTasks,
  completeMyTask,
} from "../services/api";
import "../styles/patientdashboard.css";

function PatientDashboard({ userData }) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  const loadTasks = async () => {
    try {
      setLoadingTasks(true);
      const data = await getMyTasks();
      setTasks(data);
    } catch (err) {
      console.error(err);
      setTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleLinkPsychologist = async () => {
    setMessage("");
    setError("");

    if (!code.trim()) {
      setError("Ingresa el código de vinculación.");
      return;
    }

    try {
      setLoading(true);
      const response = await linkPsychologist(code.trim());
      setMessage(response.message || "Psicólogo vinculado correctamente.");
      setCode("");
    } catch (err) {
      setError(err.message || "No se pudo vincular el psicólogo.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      await completeMyTask(taskId);
      await loadTasks();
    } catch (err) {
      alert(err.message || "No se pudo completar la tarea.");
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  return (
    <div className="patient-dashboard">
      <section className="patient-hero">
        <div>
          <p className="dashboard-label">Panel de usuario</p>
          <h1>Hola, {userData?.name || "usuario"}</h1>

          {userData?.blocked ? (
            <p className="blocked-text">
              Tu acceso al chat está bloqueado temporalmente. Contacta a tu
              psicólogo para recibir orientación.
            </p>
          ) : (
            <p>
              Este espacio está pensado para acompañarte, escucharte y ayudarte
              a organizar cómo te sientes sin emitir diagnósticos.
            </p>
          )}
        </div>

        {!userData?.blocked && (
          <Link to="/chat" className="primary-dashboard-btn">
            Ir al chat
          </Link>
        )}
      </section>

      <section className="patient-grid">
        <div className="patient-card">
          <h3>Conversar con AmigoBot</h3>
          <p>
            Puedes hablar sobre tu día, tus emociones o cualquier situación que
            necesites expresar.
          </p>
        </div>

        <div className="patient-card">
          <h3>Recordatorio importante</h3>
          <p>
            AmigoBot no diagnostica ni sustituye a un profesional de la salud
            mental.
          </p>
        </div>

        <div className="patient-card">
          <h3>Privacidad del historial</h3>
          <p>
            Tu historial detallado no se muestra aquí. Solo puede ser usado como
            apoyo por un profesional vinculado.
          </p>
        </div>

        <div className="patient-card wide-card">
          <h3>Tareas asignadas</h3>

          {loadingTasks && <p>Cargando tareas...</p>}

          {!loadingTasks && tasks.length === 0 && (
            <p>No tienes tareas asignadas por ahora.</p>
          )}

          {!loadingTasks && tasks.length > 0 && (
            <div className="patient-task-list">
              {tasks.map((task) => (
                <div className="patient-task-item" key={task.id}>
                  <div>
                    <strong>{task.title}</strong>
                    <p>{task.description || "Sin descripción."}</p>
                    <small>
                      Fecha límite: {task.dueDate || "Sin fecha"} | Estado:{" "}
                      {task.status === "completed" ? "Completada" : "Pendiente"}
                    </small>
                  </div>

                  {task.status !== "completed" && (
                    <button onClick={() => handleCompleteTask(task.id)}>
                      Marcar completada
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="patient-card wide-card">
          <h3>Vincularme con un psicólogo</h3>
          <p>
            Ingresa el código que te proporcionó tu psicólogo para permitirle
            acceder a reportes de seguimiento.
          </p>

          <div className="link-form">
            <input
              type="text"
              placeholder="Código de vinculación"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />

            <button onClick={handleLinkPsychologist} disabled={loading}>
              {loading ? "Vinculando..." : "Vincular"}
            </button>
          </div>

          {message && <p className="success-text">{message}</p>}
          {error && <p className="error-text">{error}</p>}
        </div>
      </section>
    </div>
  );
}

export default PatientDashboard;