import { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import "../styles/admindashboard.css";

function AdminDashboard() {
  const [psychologists, setPsychologists] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPendingPsychologists = async () => {
    try {
      setLoading(true);

      const usersRef = collection(db, "users");
      const snapshot = await getDocs(usersRef);

      const pending = snapshot.docs
        .map((document) => ({
          id: document.id,
          ...document.data(),
        }))
        .filter(
          (user) =>
            user.role === "psychologist" &&
            ["pending", "rejected"].includes(user.verificationStatus)
        );

      setPsychologists(pending);
    } catch (error) {
      console.error("Error cargando psicólogos:", error);
    } finally {
      setLoading(false);
    }
  };

  const approvePsychologist = async (id) => {
    try {
      const userRef = doc(db, "users", id);

      await updateDoc(userRef, {
        verificationStatus: "approved",
      });

      await loadPendingPsychologists();
    } catch (error) {
      console.error("Error aprobando psicólogo:", error);
    }
  };

  const rejectPsychologist = async (id) => {
    try {
      const userRef = doc(db, "users", id);

      await updateDoc(userRef, {
        verificationStatus: "rejected",
      });

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
                <h3>
                  {psychologist.declaredFullName || psychologist.name || "Sin nombre"}
                </h3>
                <p>{psychologist.email}</p>
                <span>Cédula: {psychologist.cedula || "No registrada"}</span>
                <span>
                  Institución: {psychologist.declaredInstitution || "No registrada"}
                </span>
                <span>
                  Año: {psychologist.declaredGraduationYear || "No registrado"}
                </span>
                <span>
                  Resultado SEP: {psychologist.verificationChecks?.sepStatus || "pendiente"}
                </span>
                <span>
                  Coincidencia de nombre:{" "}
                  {psychologist.verificationChecks?.nameMatch === true
                    ? "sí"
                    : psychologist.verificationChecks?.nameMatch === false
                      ? "no"
                      : "por revisar"}
                </span>
                <span>
                  Motivo: {psychologist.verificationMessage || "Revisión manual pendiente"}
                </span>
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
