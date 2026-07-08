import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import EmotionBar from "../components/EmotionBar";
import {
  generateInviteCode,
  getPsychologistPatients,
  getPatientConversations,
  createPatientTask,
  getPatientTasksForPsychologist,
  updatePatientBlockStatus,
  getClinicalSummary,
} from "../services/api";
import { generatePatientReportPDF } from "../utils/reportGenerator";
import "../styles/psychologistdashboard.css";

function PsychologistDashboard({ userData }) {
  const navigate = useNavigate();

  const [inviteCode, setInviteCode] = useState("");
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [tasks, setTasks] = useState([]);

  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");

  const [isBlocked, setIsBlocked] = useState(false);

  const [loadingCode, setLoadingCode] = useState(false);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState("");

  const loadPatients = async () => {
    try {
      setError("");
      setLoadingPatients(true);

      const data = await getPsychologistPatients();
      setPatients(data);

      if (data.length > 0) {
        setSelectedPatient(data[0]);
        setIsBlocked(data[0].blocked || false);
        loadConversations(data[0].patientId);
        loadTasks(data[0].patientId);
      }
    } catch (err) {
      setError(err.message || "No se pudieron cargar los pacientes.");
    } finally {
      setLoadingPatients(false);
    }
  };

  const loadConversations = async (patientId) => {
    if (!patientId) return;

    try {
      setError("");
      setLoadingConversations(true);

      const data = await getPatientConversations(patientId);
      setConversations(data);
    } catch (err) {
      setError(err.message || "No se pudieron cargar las conversaciones.");
      setConversations([]);
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadTasks = async (patientId) => {
    if (!patientId) return;

    try {
      const data = await getPatientTasksForPsychologist(patientId);
      setTasks(data);
    } catch (err) {
      console.error(err);
      setTasks([]);
    }
  };

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setIsBlocked(patient.blocked || false);
    loadConversations(patient.patientId);
    loadTasks(patient.patientId);
  };

  const handleGenerateCode = async () => {
    try {
      setError("");
      setLoadingCode(true);

      const data = await generateInviteCode();
      setInviteCode(data.code);
    } catch (err) {
      setError(err.message || "No se pudo generar el código.");
    } finally {
      setLoadingCode(false);
    }
  };

  const handleCreateTask = async () => {
    if (!selectedPatient) return;

    if (!taskTitle.trim()) {
      alert("Escribe un título.");
      return;
    }

    try {
      await createPatientTask(selectedPatient.patientId, {
        title: taskTitle,
        description: taskDescription,
        dueDate: taskDueDate,
      });

      setTaskTitle("");
      setTaskDescription("");
      setTaskDueDate("");

      loadTasks(selectedPatient.patientId);
      alert("Tarea asignada.");
    } catch (err) {
      alert(err.message);
    }
  };

  const handleBlockPatient = async () => {
    if (!selectedPatient) return;

    try {
      await updatePatientBlockStatus(selectedPatient.patientId, !isBlocked);
      setIsBlocked(!isBlocked);

      alert(!isBlocked ? "Paciente bloqueado." : "Paciente desbloqueado.");
    } catch (err) {
      alert(err.message);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedPatient) {
      alert("Selecciona un paciente.");
      return;
    }

    try {
      setLoadingReport(true);

      const summary = await getClinicalSummary(selectedPatient.patientId);

      generatePatientReportPDF({
        summary,
        psychologistName: userData?.name || "Psicólogo",
      });
    } catch (err) {
      alert(err.message || "No se pudo generar el informe.");
    } finally {
      setLoadingReport(false);
    }
  };

  const getPatientInitial = (name) => {
    if (!name) return "P";
    return name.charAt(0).toUpperCase();
  };

  const getRiskLabel = (riskLevel) => {
    if (riskLevel === "high") return "Riesgo alto";
    if (riskLevel === "medium") return "Riesgo medio";
    return "Riesgo bajo";
  };

  const getEmotionLabel = (emotion) => {
    const labels = {
      stress: "Estrés",
      sadness: "Tristeza",
      happiness: "Felicidad",
      stable: "Estabilidad",
      neutral: "Estabilidad",
    };

    return labels[emotion] || "Estabilidad";
  };

  const getEmotionEmoji = (emotion) => {
    const emojis = {
      stress: "🟠",
      sadness: "🔵",
      happiness: "🟢",
      stable: "⚪",
      neutral: "⚪",
    };

    return emojis[emotion] || "⚪";
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "Fecha no disponible";

    return new Date(dateValue).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getLastConversation = () => {
    if (conversations.length === 0) return null;
    return conversations[0];
  };

  const getEmotionValue = (emotionName) => {
    if (conversations.length === 0) return 0;

    const count = conversations.filter(
      (conversation) => conversation.dominantEmotion === emotionName
    ).length;

    return Math.round((count / conversations.length) * 100);
  };

  const getMostRepeatedFactors = () => {
    const factorCount = {};

    conversations.forEach((conversation) => {
      const factors = conversation.influencingFactors || [];

      factors.forEach((factor) => {
        factorCount[factor] = (factorCount[factor] || 0) + 1;
      });
    });

    return Object.entries(factorCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  };

  const getGlobalSummary = () => {
    if (conversations.length === 0) {
      return "Aún no hay conversaciones suficientes para generar un resumen global.";
    }

    const last = conversations[0];
    const factors = getMostRepeatedFactors()
      .map(([factor]) => factor)
      .slice(0, 3);

    return `Durante las conversaciones recientes predomina ${getEmotionLabel(
      last.dominantEmotion
    ).toLowerCase()}. ${
      last.trend || "Todavía no hay una tendencia consolidada."
    } Los factores más presentes son ${
      factors.length > 0 ? factors.join(", ") : "no especificados"
    }. Se recomienda revisar cambios en sueño, rutina, convivencia y cumplimiento de tareas.`;
  };

  useEffect(() => {
    loadPatients();
  }, []);

  const lastConversation = getLastConversation();
  const repeatedFactors = getMostRepeatedFactors();

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>Panel del Psicólogo</h1>
          <p className="dashboard-subtitle">
            Seguimiento conductual de pacientes, emociones primarias, factores
            asociados, tareas y riesgo.
          </p>
        </div>

        <button className="back-btn" onClick={() => navigate("/chat")}>
          Volver al chat
        </button>
      </div>

      {error && <p className="dashboard-error-text">{error}</p>}

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Código de vinculación</h3>
          <p>Genera un código para vincular un paciente.</p>

          <button
            className="generate-code-btn"
            onClick={handleGenerateCode}
            disabled={loadingCode}
          >
            {loadingCode ? "Generando..." : "Generar código"}
          </button>

          {inviteCode && (
            <div className="invite-code-box">
              <span>{inviteCode}</span>
              <small>Compártelo con el paciente.</small>
            </div>
          )}
        </div>

        <div className="dashboard-card">
          <h3>Pacientes</h3>

          {loadingPatients && <p className="muted-text">Cargando pacientes...</p>}

          {!loadingPatients && patients.length === 0 && (
            <p className="muted-text">Aún no tienes pacientes vinculados.</p>
          )}

          {!loadingPatients &&
            patients.map((patient) => (
              <button
                type="button"
                className={`patient-row ${
                  selectedPatient?.patientId === patient.patientId
                    ? "selected"
                    : ""
                }`}
                key={patient.id}
                onClick={() => handleSelectPatient(patient)}
              >
                <div className="patient-avatar">
                  {getPatientInitial(patient.patientName)}
                </div>

                <div>
                  <strong>{patient.patientName || "Paciente sin nombre"}</strong>
                  <span>{patient.patientEmail || "Correo no disponible"}</span>
                </div>
              </button>
            ))}
        </div>

        <div className="dashboard-card">
          <h3>Paciente seleccionado</h3>

          {selectedPatient ? (
            <div className="selected-patient-box">
              <div className="patient-avatar large">
                {getPatientInitial(selectedPatient.patientName)}
              </div>

              <div>
                <h4>{selectedPatient.patientName || "Paciente sin nombre"}</h4>
                <p>{selectedPatient.patientEmail}</p>
                <span className={isBlocked ? "danger-pill" : "status-pill"}>
                  {isBlocked ? "Acceso bloqueado" : "Vinculación activa"}
                </span>
              </div>
            </div>
          ) : (
            <p className="muted-text">Selecciona un paciente.</p>
          )}
        </div>

        <div className="dashboard-card wide smart-file-card">
          <div className="smart-card-title-row">
            <h3>Expediente inteligente</h3>

            {selectedPatient && (
              <button
                className="generate-code-btn"
                onClick={handleGenerateReport}
                disabled={loadingReport}
              >
                {loadingReport ? "Generando..." : "Generar informe PDF"}
              </button>
            )}
          </div>

          {selectedPatient && lastConversation ? (
            <>
              <div className="smart-file-header">
                <div>
                  <span>Estado actual</span>
                  <strong>
                    {getEmotionEmoji(lastConversation.dominantEmotion)}{" "}
                    {getEmotionLabel(lastConversation.dominantEmotion)}
                  </strong>
                </div>

                <div>
                  <span>Riesgo</span>
                  <strong>{getRiskLabel(lastConversation.riskLevel)}</strong>
                </div>

                <div>
                  <span>Sesiones</span>
                  <strong>{conversations.length}</strong>
                </div>
              </div>

              <div className="smart-section">
                <h4>Tendencia detectada</h4>
                <p>
                  {lastConversation.trend ||
                    "Aún no hay tendencia suficiente para interpretar cambios."}
                </p>
              </div>

              <div className="smart-section">
                <h4>Cambio conductual reciente</h4>
                <p>
                  {lastConversation.behaviorChange ||
                    "No se detectó un cambio conductual claro."}
                </p>
              </div>

              <div className="smart-tags-grid">
                <div>
                  <h4>Factores repetidos</h4>
                  <div className="tag-list">
                    {lastConversation.repeatedFactors?.length > 0 ? (
                      lastConversation.repeatedFactors.map((factor) => (
                        <span className="smart-tag" key={factor}>
                          {factor}
                        </span>
                      ))
                    ) : (
                      <span className="muted-text">Sin repetidos</span>
                    )}
                  </div>
                </div>

                <div>
                  <h4>Factores emergentes</h4>
                  <div className="tag-list">
                    {lastConversation.emergingFactors?.length > 0 ? (
                      lastConversation.emergingFactors.map((factor) => (
                        <span className="smart-tag warning" key={factor}>
                          {factor}
                        </span>
                      ))
                    ) : (
                      <span className="muted-text">Sin emergentes</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="smart-section">
                <h4>Resumen global del paciente</h4>
                <p>{getGlobalSummary()}</p>
              </div>
            </>
          ) : (
            <p className="muted-text">
              Selecciona un paciente con conversaciones para generar expediente.
            </p>
          )}
        </div>

        <div className="dashboard-card">
          <h3>Emociones primarias</h3>

          {selectedPatient ? (
            loadingConversations ? (
              <p className="muted-text">Cargando tendencias...</p>
            ) : (
              <>
                <EmotionBar label="Estrés" value={getEmotionValue("stress")} />
                <EmotionBar label="Tristeza" value={getEmotionValue("sadness")} />
                <EmotionBar label="Felicidad" value={getEmotionValue("happiness")} />
                <EmotionBar label="Estabilidad" value={getEmotionValue("stable")} />
              </>
            )
          ) : (
            <p className="muted-text">Selecciona un paciente.</p>
          )}
        </div>

        <div className="dashboard-card">
          <h3>Factores que influyen</h3>

          {repeatedFactors.length > 0 ? (
            <div className="factor-list">
              {repeatedFactors.map(([factor, count]) => (
                <div className="factor-item" key={factor}>
                  <span>{factor}</span>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted-text">Sin factores suficientes registrados.</p>
          )}
        </div>

        <div className="dashboard-card alert">
          <h3>Acciones clínicas</h3>

          {selectedPatient ? (
            <>
              <button className="generate-code-btn" onClick={handleBlockPatient}>
                {isBlocked ? "Desbloquear paciente" : "Bloquear paciente"}
              </button>

              <p className="muted-text">
                Úsalo si necesitas impedir temporalmente el acceso del paciente.
              </p>
            </>
          ) : (
            <p className="muted-text">Selecciona un paciente.</p>
          )}
        </div>

        <div className="dashboard-card">
          <h3>Asignar tarea</h3>

          {selectedPatient ? (
            <div className="task-form">
              <input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Título de la tarea"
              />

              <textarea
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Descripción breve"
              />

              <input
                type="date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
              />

              <button className="generate-code-btn" onClick={handleCreateTask}>
                Asignar tarea
              </button>
            </div>
          ) : (
            <p className="muted-text">Selecciona un paciente.</p>
          )}
        </div>

        <div className="dashboard-card wide">
          <h3>Línea temporal emocional</h3>

          {conversations.length === 0 ? (
            <p className="muted-text">Sin conversaciones registradas.</p>
          ) : (
            <div className="emotion-timeline">
              {conversations
                .slice()
                .reverse()
                .map((conversation) => (
                  <div className="timeline-session" key={conversation.id}>
                    <div className="timeline-dot">
                      {getEmotionEmoji(conversation.dominantEmotion)}
                    </div>

                    <div>
                      <strong>{getEmotionLabel(conversation.dominantEmotion)}</strong>
                      <span>{formatDate(conversation.updatedAt)}</span>
                      <p>
                        {conversation.trend ||
                          conversation.behaviorChange ||
                          "Sin tendencia registrada."}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="dashboard-card wide">
          <h3>Tareas del paciente</h3>

          {tasks.length === 0 ? (
            <p className="muted-text">No hay tareas asignadas.</p>
          ) : (
            <div className="task-list">
              {tasks.map((task) => (
                <div className="task-item" key={task.id}>
                  <div>
                    <strong>{task.title}</strong>
                    <p>{task.description || "Sin descripción."}</p>
                    <small>
                      Fecha límite: {task.dueDate || "Sin fecha"} | Estado:{" "}
                      {task.status === "completed" ? "Completada" : "Pendiente"}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dashboard-card wide">
          <h3>Historial conductual</h3>

          {loadingConversations && (
            <p className="muted-text">Cargando conversaciones...</p>
          )}

          {!loadingConversations && conversations.length === 0 && (
            <p className="muted-text">Sin conversaciones registradas.</p>
          )}

          {!loadingConversations &&
            conversations.map((conversation) => (
              <div className="history-item" key={conversation.id}>
                <span>{conversation.title}</span>
                <p>{conversation.summary}</p>

                <small>
                  Tendencia: {conversation.trend || "Sin tendencia registrada."}
                </small>

                <small>
                  Cambio conductual:{" "}
                  {conversation.behaviorChange ||
                    "Sin cambio conductual registrado."}
                </small>

                <small>
                  Factores:{" "}
                  {conversation.influencingFactors?.length > 0
                    ? conversation.influencingFactors.join(", ")
                    : "Sin factores registrados"}
                </small>

                <small>
                  Emergentes:{" "}
                  {conversation.emergingFactors?.length > 0
                    ? conversation.emergingFactors.join(", ")
                    : "Ninguno"}
                </small>

                <small>
                  Emoción: {getEmotionLabel(conversation.dominantEmotion)} |
                  Riesgo: {getRiskLabel(conversation.riskLevel)}
                </small>

                <small>Última actividad: {formatDate(conversation.updatedAt)}</small>
              </div>
            ))}

          <div className="history-note">
            AmigoBot no diagnostica. El panel muestra cambios conductuales,
            emociones primarias y factores asociados como apoyo profesional.
          </div>
        </div>
      </div>
    </div>
  );
}

export default PsychologistDashboard;