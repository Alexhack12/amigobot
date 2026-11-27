import { useEffect, useState } from "react";
import {
  approvePsychologist as approvePsychologistRequest,
  getPendingPsychologists,
  rejectPsychologist as rejectPsychologistRequest,
} from "../services/api";
import "../styles/admindashboard.css";

function AdminDashboard() {
  const [psychologists, setPsychologists] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPendingPsychologists = async () => {
    try {
      setLoading(true);

      setPsychologists(await getPendingPsychologists());
    } catch (error) {
      console.error("Error cargando psicólogos:", error);
    } finally {
      setLoading(false);
    }
  };

  const approvePsychologist = async (id) => {
    try {
      await approvePsychologistRequest(id);

      await loadPendingPsychologists();
    } catch (error) {
      console.error("Error aprobando psicólogo:", error);
    }
  };

  const rejectPsychologist = async (id) => {
    try {
      await rejectPsychologistRequest(id);

      await loadPendingPsychologists();
    } catch (error) {
      console.error("Error rechazando psicólogo:", error);
    }
  };

  useEffect(() => {
    loadPendingPsychologists();
  }, []);

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div>
          <p className="admin-label">Panel administrativo</p>
          <h1>Validación de psicólogos</h1>
          <p>
            Revisa las solicitudes de cuentas profesionales antes de permitirles
            acceder al panel clínico.
          </p>
        </div>
      </div>

      <div className="admin-card">
        <h2>Solicitudes pendientes</h2>

        {loading && <p>Cargando solicitudes...</p>}

        {!loading && psychologists.length === 0 && (
          <p className="empty-text">No hay psicólogos pendientes por revisar.</p>
        )}

        {!loading &&
          psychologists.map((psychologist) => (
            <div className="psychologist-request" key={psychologist.id}>
              <div>
                <h3>{psychologist.name || "Sin nombre"}</h3>
                <p>{psychologist.email}</p>
                <span>Cédula: {psychologist.cedula || "No registrada"}</span>
              </div>

              <div className="request-actions">
                <button
                  className="approve-btn"
                  onClick={() => approvePsychologist(psychologist.id)}
                >
                  Aprobar
                </button>

                <button
                  className="reject-btn"
                  onClick={() => rejectPsychologist(psychologist.id)}
                >
                  Rechazar
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

export default AdminDashboard;
