import "../styles/pendingpsychologistdashboard.css";

function PendingPsychologistDashboard({ userData }) {
  const isRejected = userData?.verificationStatus === "rejected";

  return (
    <div className="pending-dashboard">
      <div className="pending-card">
        <span className="pending-badge">
          {isRejected ? "Revisión manual disponible" : "Cuenta en revisión"}
        </span>

        <h1>Hola, {userData?.name || "psicólogo"}</h1>

        <p>
          {isRejected
            ? "No fue posible validar automáticamente la información profesional. Puedes solicitar una revisión manual con el administrador."
            : "Verificación pendiente de revisión. Tu cuenta seguirá protegida mientras concluye la comprobación profesional."}
        </p>

        <div className="pending-info">
          <p>
            <strong>Cédula registrada:</strong>{" "}
            {userData?.cedula || "No registrada"}
          </p>

          <p>
            <strong>Estado:</strong>{" "}
            {isRejected ? "Requiere revisión manual" : "Pendiente de revisión"}
          </p>

          {userData?.verificationMessage && (
            <p>
              <strong>Motivo:</strong> {userData.verificationMessage}
            </p>
          )}
        </div>

        <p className="pending-warning">
          Mientras tu cuenta no esté aprobada, no podrás acceder a historiales,
          reportes ni pacientes vinculados. Este resultado no confirma identidad.
        </p>
      </div>
    </div>
  );
}

export default PendingPsychologistDashboard;
