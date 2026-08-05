import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../services/firebase";
import { verifyPsychologist } from "../services/api";
import {
  buildRegistrationUserData,
  completePsychologistVerification,
  isPsychologistRegistration,
  REGISTRATION_DASHBOARD_PATH,
} from "../utils/registrationFlow.js";
import "../styles/auth.css";

function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [role, setRole] = useState("patient");
  const [cedula, setCedula] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [institution, setInstitution] = useState("");
  const [idDocument, setIdDocument] = useState(null);
  const [documentConsent, setDocumentConsent] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isPsychologist = isPsychologistRegistration(role);

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

    if (isPsychologist) {
      if (!cedula.trim() || !graduationYear.trim() || !institution.trim()) {
        setError("Completa todos los datos profesionales.");
        return;
      }

      if (!/^\d{4}$/.test(graduationYear.trim())) {
        setError("Ingresa un año de expedición válido.");
        return;
      }

      if (!idDocument) {
        setError("Adjunta una fotografía frontal y legible de tu INE.");
        return;
      }

      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

      if (!allowedTypes.includes(idDocument.type)) {
        setError("El INE debe estar en formato JPEG, PNG o WEBP.");
        return;
      }

      if (idDocument.size > 5 * 1024 * 1024) {
        setError("La imagen del INE no debe superar 5 MB.");
        return;
      }

      if (!documentConsent) {
        setError("Debes autorizar el análisis temporal de la imagen.");
        return;
      }
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

      const userData = buildRegistrationUserData({
        uid: userCredential.user.uid,
        name,
        email,
        role,
        cedula,
        graduationYear,
        institution,
        createdAt: serverTimestamp(),
      });

      await setDoc(doc(db, "users", userCredential.user.uid), userData);

      let verificationMessage = "";

      if (isPsychologist) {
        verificationMessage = await completePsychologistVerification(
          verifyPsychologist,
          {
            declaredFullName: name.trim(),
            cedula: cedula.trim(),
            declaredGraduationYear: graduationYear.trim(),
            declaredInstitution: institution.trim(),
            documentConsent,
            idDocument,
          }
        );

        if (verificationMessage === "Verificación pendiente de revisión") {
          console.warn(
            "La verificación automática no concluyó; la cuenta permanece pendiente."
          );
        }
      }

      navigate(REGISTRATION_DASHBOARD_PATH, {
        state: verificationMessage ? { verificationMessage } : undefined,
      });
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
            name="name"
            autoComplete="name"
            placeholder="Nombre completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            type="email"
            name="email"
            autoComplete="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="role-selector">
            <button
              type="button"
              className={`role-option ${role === "patient" ? "selected" : ""}`}
              onClick={() => {
                setRole("patient");
                setDocumentConsent(false);
              }}
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

          {isPsychologist && (
            <div className="professional-fields">
              <input
                type="text"
                name="cedula"
                autoComplete="off"
                inputMode="numeric"
                placeholder="Cédula profesional"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
              />

              <input
                type="text"
                name="declaredGraduationYear"
                autoComplete="off"
                inputMode="numeric"
                maxLength={4}
                placeholder="Año de expedición"
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
              />

              <input
                type="text"
                name="declaredInstitution"
                autoComplete="organization"
                placeholder="Institución educativa"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
              />

              <label className="auth-file-label">
                <strong>Fotografía frontal del INE</strong>
                <span>JPEG, PNG o WEBP. Máximo 5 MB.</span>
                <input
                  type="file"
                  name="idDocument"
                  autoComplete="off"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  onChange={(e) => setIdDocument(e.target.files?.[0] || null)}
                />
              </label>

              <label className="auth-consent">
                <input
                  type="checkbox"
                  name="documentConsent"
                  autoComplete="off"
                  checked={documentConsent}
                  onChange={(e) => setDocumentConsent(e.target.checked)}
                />
                <span>
                  Autorizo el análisis temporal de la imagen para comparar el nombre
                  declarado. Entiendo que no se realizará reconocimiento facial y que
                  la imagen no se conservará.
                </span>
              </label>
            </div>
          )}

          <input
            type="password"
            name="password"
            autoComplete="new-password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <input
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
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
