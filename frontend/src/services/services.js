import { auth } from "./firebase";

const API_URL = "http://localhost:3001/api";

export const apiRequest = async (endpoint, options = {}) => {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("No hay usuario autenticado");
  }

  const token = await user.getIdToken();

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Error en la API");
  }

  return data;
};