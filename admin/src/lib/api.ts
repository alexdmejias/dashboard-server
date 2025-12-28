import type { ClientsData } from "../types";

export async function fetchClients(): Promise<ClientsData> {
  const response = await fetch("/api/clients");
  if (!response.ok) {
    throw new Error("Failed to fetch clients");
  }
  return response.json();
}
