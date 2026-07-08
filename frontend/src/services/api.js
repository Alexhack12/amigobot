import { auth } from "./firebase";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001/api";

const getAuthToken = async () => {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("No hay usuario autenticado.");
  }

  return user.getIdToken();
};

export const sendChatMessage = async (message, conversationId) => {
  const token = await getAuthToken();

  const response = await fetch(`${API_URL}/chat/message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message, conversationId }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Error al enviar mensaje.");
  }

  return data;
};

export const createConversation = async () => {
  const token = await getAuthToken();

  const response = await fetch(`${API_URL}/chat/conversations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Error creando conversación.");
  }

  return data;
};

export const getConversations = async () => {
  const token = await getAuthToken();

  const response = await fetch(`${API_URL}/chat/conversations`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Error obteniendo conversaciones.");
  }

  return data;
};

export const generateInviteCode = async () => {
  const token = await getAuthToken();

  const response = await fetch(`${API_URL}/psychologists/generate-invite`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Error generando código.");
  }

  return data;
};

export const linkPsychologist = async (code) => {
  const token = await getAuthToken();

  const response = await fetch(`${API_URL}/users/link-psychologist`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ code }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Error vinculando psicólogo.");
  }

  return data;
};

export const getPsychologistPatients = async () => {
  const token = await getAuthToken();

  const response = await fetch(`${API_URL}/psychologists/patients`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Error obteniendo pacientes.");
  }

  return data;
};

export const getPatientReports = async (patientId) => {
  const token = await getAuthToken();

  const response = await fetch(
    `${API_URL}/psychologists/patient/${patientId}/reports`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Error obteniendo reportes.");
  }

  return data;
};

export const getPatientConversations = async (patientId) => {
  const token = await getAuthToken();

  const response = await fetch(
    `${API_URL}/psychologists/patient/${patientId}/conversations`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Error obteniendo conversaciones.");
  }

  return data;
};

export const createPatientTask = async (patientId, taskData) => {
  const token = await getAuthToken();

  const response = await fetch(
    `${API_URL}/psychologists/patient/${patientId}/tasks`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(taskData),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Error creando tarea.");
  }

  return data;
};

export const getPatientTasksForPsychologist = async (patientId) => {
  const token = await getAuthToken();

  const response = await fetch(
    `${API_URL}/psychologists/patient/${patientId}/tasks`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Error obteniendo tareas.");
  }

  return data;
};

export const updatePatientBlockStatus = async (patientId, blocked) => {
  const token = await getAuthToken();

  const response = await fetch(
    `${API_URL}/psychologists/patient/${patientId}/block`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ blocked }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Error actualizando bloqueo.");
  }

  return data;
};

export const getMyTasks = async () => {
  const token = await getAuthToken();

  const response = await fetch(`${API_URL}/users/tasks`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Error obteniendo tareas.");
  }

  return data;
};

export const completeMyTask = async (taskId) => {
  const token = await getAuthToken();

  const response = await fetch(`${API_URL}/users/tasks/${taskId}/complete`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Error completando tarea.");
  }

  return data;
};
export const getClinicalSummary = async (patientId) => {
  const token = await getAuthToken();

  const response = await fetch(
    `${API_URL}/psychologists/patient/${patientId}/clinical-summary`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Error generando resumen clínico.");
  }

  return data;
};