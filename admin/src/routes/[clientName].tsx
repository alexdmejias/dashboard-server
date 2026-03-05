import { A, useParams } from "@solidjs/router";
import { createQuery } from "@tanstack/solid-query";
import { For, Show } from "solid-js";
import { PlaylistEditor } from "../components/PlaylistEditor";
import { RawLogViewer } from "../components/RawLogViewer";
import { fetchClientDetail } from "../lib/api";
import type { ClientConfig } from "../types";

export default function ClientDetail() {
  const params = useParams();
  const clientName = () => params.clientName;

  const clientQuery = createQuery(() => ({
    queryKey: ["client", clientName()],
    queryFn: () => fetchClientDetail(clientName()),
  }));

  const getCallbackOptions = (callbackId: string): Record<string, unknown> => {
    const playlist: ClientConfig["playlist"] =
      clientQuery.data?.config?.playlist ?? [];
    for (const item of playlist) {
      for (const [slot, cb] of Object.entries(item.callbacks)) {
        if (`${item.id}-${slot}` === callbackId) {
          return cb.options ?? {};
        }
      }
    }
    return {};
  };

  return (
    <main class="min-h-screen bg-base-200">
      <div class="navbar bg-base-100 shadow-lg">
        <div class="flex-1">
          <A href="/" class="btn btn-ghost text-xl">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Dashboard
          </A>
        </div>
      </div>

      <div class="container mx-auto p-4">
        <Show
          when={!clientQuery.isLoading}
          fallback={
            <div class="flex justify-center items-center py-8">
              <span class="loading loading-spinner loading-lg" />
            </div>
          }
        >
          <div class="mb-6">
            <h1 class="text-3xl font-bold mb-2">{clientName()}</h1>
            <div class="text-sm breadcrumbs">
              <ul>
                <li>
                  <A href="/">Dashboard</A>
                </li>
                <li>Client Details</li>
              </ul>
            </div>
          </div>

          {/* Client Summary */}
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div class="stat bg-base-100 shadow">
              <div class="stat-title">Current Index</div>
              <div class="stat-value text-primary">
                {clientQuery.data?.config?.currCallbackIndex ?? 0}
              </div>
            </div>
            <div class="stat bg-base-100 shadow">
              <div class="stat-title">Total Callbacks</div>
              <div class="stat-value text-secondary">
                {Object.keys(clientQuery.data?.callbacks ?? {}).length}
              </div>
            </div>
          </div>

          {/* Callbacks Table */}
          <div class="card bg-base-100 shadow-xl mb-6">
            <div class="card-body">
              <h2 class="card-title">Available Callbacks</h2>
              <div class="overflow-x-auto">
                <table class="table table-zebra">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Options</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For
                      each={Object.entries(clientQuery.data?.callbacks ?? {})}
                    >
                      {([id, callback]) => (
                        <tr>
                          <td class="font-mono text-sm">{id}</td>
                          <td>{callback.name}</td>
                          <td class="text-xs">
                            {JSON.stringify(getCallbackOptions(id))}
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Playlist Editor */}
          <div class="mb-6">
            <PlaylistEditor
              clientName={clientName()}
              initialPlaylist={clientQuery.data?.config?.playlist || []}
            />
          </div>

          {/* Logs */}
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title">Logs</h2>
              <RawLogViewer initialClientName={clientName()} />
            </div>
          </div>
        </Show>
      </div>
    </main>
  );
}
