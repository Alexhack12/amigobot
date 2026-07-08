import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../services/firebase";
import "../styles/auth.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const syncGoogleUser = async (user) => {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        name: user.displayName || "Usuario",
        email: user.email,
        role: "patient",
        verificationStatus: "approved",
        blocked: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  };

  const handleLogin = async () => {
    setError("");

    if (!email || !password) {
      setError("Completa todos los campos.");
      return;
    }

    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard");
    } catch (err) {
      setError("Correo o contraseña incorrectos.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");

    try {
      setGoogleLoading(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      await syncGoogleUser(result.user);

      navigate("/dashboard");
    } catch (err) {
      console.error("Error con Google:", err);
      setError("No se pudo iniciar sesión con Google.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Iniciar sesión</h1>
        <p>Entra a tu espacio seguro con AmigoBot.</p>

        <button
          type="button"
          className="google-btn"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
        >
          {googleLoading ? "Conectando..." : "Continuar con Google"}
        </button>

        <div className="auth-divider">o</div>

        <form className="auth-form">
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p className="auth-error">{error}</p>}

          <button type="button" onClick={handleLogin} disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <span>
          ¿No tienes cuenta? <Link to="/register">Crear cuenta</Link>
        </span>
      </div>
    </div>
  );
}

export default Login;