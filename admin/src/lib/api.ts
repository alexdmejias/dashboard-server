import type { ClientsData } from "../types";

// Helper function to create headers with authorization token
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("adminToken");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  return headers;
}

export async function fetchClients(): Promise<ClientsData> {
  const response = await fetch("/api/clients", {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch clients");
  }
  return response.json();
}

export async function fetchClientDetail(clientName: string) {
  const response = await fetch(`/api/clients/${clientName}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch client details");
  }
  return response.json();
}

export async function fetchClientLogs(clientName: string) {
  const response = await fetch(`/api/clients/${clientName}/logs`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    return { logs: [] };
  }
  return response.json();
}

export async function fetchClientRequests(clientName: string) {
  const response = await fetch(`/api/clients/${clientName}/requests`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    return { requests: [] };
  }
  return response.json();
}

export async function fetchAvailableCallbacks() {
  const response = await fetch("/api/callbacks", {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch available callbacks");
  }
  return response.json();
}

export async function updateClientPlaylist(
  clientName: string,
  playlist: {
    id: string;
    callbackName: string;
    options?: Record<string, unknown>;
  }[]
) {
  const response = await fetch(`/api/clients/${clientName}/playlist`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ playlist }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update playlist");
  }
  return response.json();
}
