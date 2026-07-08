import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../services/firebase";
import "../styles/auth.css";

function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [role, setRole] = useState("patient");
  const [cedula, setCedula] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Completa todos los campos.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (role === "psychologist" && !cedula.trim()) {
      setError("Ingresa tu cédula profesional.");
      return;
    }

    try {
      setLoading(true);

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      await updateProfile(userCredential.user, {
        displayName: name,
      });

      const userData = {
        uid: userCredential.user.uid,
        name: name.trim(),
        email: email.trim(),
        role,
        cedula: role === "psychologist" ? cedula.trim() : null,
        verificationStatus: role === "psychologist" ? "pending" : "approved",
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, "users", userCredential.user.uid), userData);

      navigate("/dashboard");
    } catch (err) {
      console.error("Error registrando usuario:", err);

      if (err.code === "auth/email-already-in-use") {
        setError("Ese correo ya está registrado.");
      } else if (err.code === "auth/invalid-email") {
        setError("El correo no es válido.");
      } else if (err.code === "permission-denied") {
        setError("Firebase no permitió guardar el usuario. Revisa las reglas de Firestore.");
      } else {
        setError("No se pudo crear la cuenta. Revisa la consola.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Crear cuenta</h1>
        <p>Elige cómo usarás AmigoBot.</p>

        <form className="auth-form" onSubmit={handleRegister}>
          <input
            type="text"
            placeholder="Nombre completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="role-selector">
            <button
              type="button"
              className={`role-option ${role === "patient" ? "selected" : ""}`}
              onClick={() => setRole("patient")}
            >
              <strong>Usuario</strong>
              <span>Quiero hablar con AmigoBot</span>
            </button>

            <button
              type="button"
              className={`role-option ${role === "psychologist" ? "selected" : ""}`}
              onClick={() => setRole("psychologist")}
            >
              <strong>Psicólogo</strong>
              <span>Quiero dar seguimiento a pacientes</span>
            </button>
          </div>

          {role === "psychologist" && (
            <input
              type="text"
              placeholder="Cédula profesional"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
            />
          )}

          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <input
            type="password"
            placeholder="Confirmar contraseña"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Creando cuenta..." : "Registrarme"}
          </button>
        </form>

        <span>
          ¿Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link>
        </span>
      </div>
    </div>
  );
}

export default Register;