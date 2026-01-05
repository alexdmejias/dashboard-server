import { useParams, A } from "@solidjs/router";
import { createQuery } from "@tanstack/solid-query";
import { For, Show } from "solid-js";
import { fetchClientDetail, fetchClientLogs, fetchClientRequests } from "../lib/api";

interface ClientLog {
  timestamp: string;
  level: string;
  message: string;
  reqId?: string;
}

interface ClientRequest {
  timestamp: string;
  method: string;
  url: string;
  statusCode?: number;
  responseTime?: number;
  reqId: string;
}

export default function ClientDetail() {
  const params = useParams();
  const clientName = () => params.clientName;

  const clientQuery = createQuery(() => ({
    queryKey: ["client", clientName()],
    queryFn: () => fetchClientDetail(clientName()),
  }));

  const logsQuery = createQuery(() => ({
    queryKey: ["client-logs", clientName()],
    queryFn: () => fetchClientLogs(clientName()),
    refetchInterval: 5000, // Refresh logs every 5 seconds
  }));

  const requestsQuery = createQuery(() => ({
    queryKey: ["client-requests", clientName()],
    queryFn: () => fetchClientRequests(clientName()),
    refetchInterval: 5000, // Refresh requests every 5 seconds
  }));

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
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
              <span class="loading loading-spinner loading-lg"></span>
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
            <div class="stat bg-base-100 shadow">
              <div class="stat-title">Total Requests</div>
              <div class="stat-value text-accent">
                {requestsQuery.data?.requests?.length ?? 0}
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
                    <For each={Object.entries(clientQuery.data?.callbacks ?? {})}>
                      {([id, callback]) => (
                        <tr>
                          <td class="font-mono text-sm">{id}</td>
                          <td>{callback.name}</td>
                          <td class="text-xs">
                            {JSON.stringify(
                              clientQuery.data?.config?.playlist?.find(
                                (p: any) => p.id === id
                              )?.options ?? {}
                            )}
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Requests Table */}
          <div class="card bg-base-100 shadow-xl mb-6">
            <div class="card-body">
              <h2 class="card-title">Recent Requests</h2>
              <Show
                when={!requestsQuery.isLoading}
                fallback={
                  <div class="flex justify-center py-4">
                    <span class="loading loading-spinner"></span>
                  </div>
                }
              >
                <Show
                  when={requestsQuery.data?.requests?.length > 0}
                  fallback={
                    <p class="text-gray-500">No requests recorded yet</p>
                  }
                >
                  <div class="overflow-x-auto">
                    <table class="table table-zebra table-sm">
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>Method</th>
                          <th>URL</th>
                          <th>Status</th>
                          <th>Response Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        <For each={requestsQuery.data?.requests}>
                          {(request: ClientRequest) => (
                            <tr>
                              <td class="text-xs">
                                {formatDate(request.timestamp)}
                              </td>
                              <td>
                                <span class="badge badge-sm">
                                  {request.method}
                                </span>
                              </td>
                              <td class="font-mono text-xs">{request.url}</td>
                              <td>
                                <span
                                  class={`badge badge-sm ${
                                    request.statusCode &&
                                    request.statusCode < 400
                                      ? "badge-success"
                                      : "badge-error"
                                  }`}
                                >
                                  {request.statusCode ?? "N/A"}
                                </span>
                              </td>
                              <td class="text-xs">
                                {request.responseTime
                                  ? `${request.responseTime.toFixed(2)}ms`
                                  : "N/A"}
                              </td>
                            </tr>
                          )}
                        </For>
                      </tbody>
                    </table>
                  </div>
                </Show>
              </Show>
            </div>
          </div>

          {/* Logs Table */}
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title">Logs</h2>
              <Show
                when={!logsQuery.isLoading}
                fallback={
                  <div class="flex justify-center py-4">
                    <span class="loading loading-spinner"></span>
                  </div>
                }
              >
                <Show
                  when={logsQuery.data?.logs?.length > 0}
                  fallback={<p class="text-gray-500">No logs recorded yet</p>}
                >
                  <div class="overflow-x-auto max-h-96">
                    <table class="table table-zebra table-sm">
                      <thead class="sticky top-0 bg-base-100">
                        <tr>
                          <th>Time</th>
                          <th>Level</th>
                          <th>Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        <For each={logsQuery.data?.logs}>
                          {(log: ClientLog) => (
                            <tr>
                              <td class="text-xs">
                                {formatDate(log.timestamp)}
                              </td>
                              <td>
                                <span
                                  class={`badge badge-sm ${
                                    log.level === "error"
                                      ? "badge-error"
                                      : log.level === "warn"
                                        ? "badge-warning"
                                        : log.level === "info"
                                          ? "badge-info"
                                          : "badge-ghost"
                                  }`}
                                >
                                  {log.level}
                                </span>
                              </td>
                              <td class="text-xs font-mono">{log.message}</td>
                            </tr>
                          )}
                        </For>
                      </tbody>
                    </table>
                  </div>
                </Show>
              </Show>
            </div>
          </div>
        </Show>
      </div>
    </main>
  );
}
