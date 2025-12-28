import { createQuery } from "@tanstack/solid-query";
import { Show } from "solid-js";
import { ClientsList } from "../components/ClientsList";
import { fetchClients } from "../lib/api";
import { createSSEConnection } from "../lib/sse";

export default function Home() {
  // Use TanStack Query for initial data fetch
  const clientsQuery = createQuery(() => ({
    queryKey: ["clients"],
    queryFn: fetchClients,
  }));

  // Use SSE for real-time updates, starting with initial data from query
  const { data, connected, error } = createSSEConnection(
    "/api/clients/stream",
    {
      initialData: clientsQuery.data,
    },
  );

  return (
    <main class="min-h-screen bg-base-200">
      <div class="navbar bg-base-100 shadow-lg">
        <div class="flex-1">
          <a class="btn btn-ghost text-xl">Dashboard Server Admin</a>
        </div>
        <div class="flex-none">
          <div class="badge badge-lg">
            <Show
              when={connected()}
              fallback={<span class="text-error">Disconnected</span>}
            >
              <span class="text-success">Connected</span>
            </Show>
          </div>
        </div>
      </div>
      <div class="p-4">
        <Show when={error() || clientsQuery.error}>
          <div class="alert alert-error mb-4">
            <span>
              Error:{" "}
              {clientsQuery.error
                ? "Failed to load initial data"
                : "Error connecting to server"}
            </span>
          </div>
        </Show>
        <Show when={clientsQuery.isLoading}>
          <div class="flex justify-center items-center py-8">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
        </Show>
        <ClientsList data={data()} />
      </div>
    </main>
  );
}
