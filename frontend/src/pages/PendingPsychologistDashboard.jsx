import "../styles/pendingpsychologistdashboard.css";

function PendingPsychologistDashboard({ userData }) {
  return (
    <div className="pending-dashboard">
      <div className="pending-card">
        <span className="pending-badge">Cuenta en revisión</span>

        <h1>Hola, {userData?.name || "psicólogo"}</h1>

        <p>
          Tu cuenta fue registrada como psicólogo, pero aún falta verificar tu
          cédula profesional antes de activar el panel clínico.
        </p>

        <div className="pending-info">
          <p>
            <strong>Cédula registrada:</strong>{" "}
            {userData?.cedula || "No registrada"}
          </p>

          <p>
            <strong>Estado:</strong> Pendiente de aprobación
          </p>
        </div>

        <p className="pending-warning">
          Mientras tu cuenta esté en revisión, no podrás acceder a historiales,
          reportes ni pacientes vinculados.
        </p>
      </div>
    </div>
  );
}

export default PendingPsychologistDashboard;