import { Show } from "solid-js";
import { ClientsList } from "../components/ClientsList";
import { createSSEConnection } from "../lib/sse";

export default function Home() {
  const { data, connected, error } = createSSEConnection("/api/clients/stream");

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
        <Show when={error()}>
          <div class="alert alert-error mb-4">
            <span>Error connecting to server</span>
          </div>
        </Show>
        <ClientsList data={data()} />
      </div>
    </main>
  );
}
