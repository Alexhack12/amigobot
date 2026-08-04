import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Registrar el service worker únicamente en la versión compilada.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");

      console.log(
        "Service Worker registrado correctamente:",
        registration.scope
      );
    } catch (error) {
      console.error("Error al registrar el Service Worker:", error);
    }
  });
}