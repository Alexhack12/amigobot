import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDocFromServer,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../services/firebase";

import PatientDashboard from "./PatientDashboard";
import PsychologistDashboard from "./PsychologistDashboard";
import PendingPsychologistDashboard from "./PendingPsychologistDashboard";
import AdminDashboard from "./AdminDashboard";

function DashboardRouter() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        setLoading(true);
        setErrorMessage("");

        if (!currentUser) {
          setErrorMessage("No hay una sesión activa. Inicia sesión nuevamente.");
          setLoading(false);
          return;
        }

        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDocFromServer(userRef);

        if (userSnap.exists()) {
          const data = {
            id: userSnap.id,
            ...userSnap.data(),
          };

          console.log("DashboardRouter userData:", data);
          setUserData(data);
        } else {
          const newUserData = {
            uid: currentUser.uid,
            name: currentUser.displayName || "Usuario",
            email: currentUser.email,
            role: "patient",
            verificationStatus: "approved",
            blocked: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };

          await setDoc(userRef, newUserData);
          setUserData(newUserData);
        }
      } catch (error) {
        console.error("Error en DashboardRouter:", error);
        setErrorMessage("No se pudo cargar el dashboard. Revisa Firebase o la consola.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="dashboard-loading">Cargando dashboard...</div>;
  }

  if (errorMessage) {
    return <div className="dashboard-error">{errorMessage}</div>;
  }

  if (!userData) {
    return <div className="dashboard-error">No se encontró información del usuario.</div>;
  }

  if (userData.role === "admin") {
    return <AdminDashboard userData={userData} />;
  }

  if (userData.role === "psychologist") {
    if (userData.verificationStatus === "approved") {
      return <PsychologistDashboard userData={userData} />;
    }

    return <PendingPsychologistDashboard userData={userData} />;
  }

  return <PatientDashboard userData={userData} />;
}

export default DashboardRouter;