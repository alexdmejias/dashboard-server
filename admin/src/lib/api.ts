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
