import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../services/firebase";
import {
  createRealtimeUserAccessMonitor,
  saveBlockedAuthNotice,
} from "../services/realtimeUserAccess";
import { AuthContext } from "./authContext";

function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(undefined);
  const [accessStatus, setAccessStatus] = useState("checking");

  useEffect(() => {
    return createRealtimeUserAccessMonitor({
      observeAuth: (callback) => onAuthStateChanged(auth, callback),
      subscribeUser: (uid, onNext, onError) =>
        onSnapshot(doc(db, "users", uid), onNext, onError),
      signOutUser: () => signOut(auth),
      onAuthUser: setUser,
      onAccessChange: setAccessStatus,
      onBlocked: () => {
        setUser(null);
        saveBlockedAuthNotice(window.sessionStorage);
        navigate("/login", { replace: true });
      },
      onError: (error) => {
        console.error("Error observando el estado de acceso del usuario:", error);
      },
    });
  }, [navigate]);

  const value = useMemo(
    () => ({ user, accessStatus }),
    [user, accessStatus]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
