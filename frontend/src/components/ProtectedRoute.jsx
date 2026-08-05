import { Navigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { auth } from "../services/firebase";

function ProtectedRoute({ children }) {
  const { user, accessStatus } = useAuth();

  if (accessStatus === "blocked") {
    return <Navigate to="/login" replace />;
  }

  if (
    user === undefined ||
    accessStatus === "checking" ||
    (!user && auth.currentUser)
  ) {
    return <div style={{ color: "white", padding: "30px" }}>Cargando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
