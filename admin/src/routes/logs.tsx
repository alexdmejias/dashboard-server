import { createQuery } from "@tanstack/solid-query";
import { Show, For, createSignal } from "solid-js";
import { A } from "@solidjs/router";
import { fetchServerLogs } from "../lib/api";

export default function Logs() {
  const [filter, setFilter] = createSignal("");
  const [levelFilter, setLevelFilter] = createSignal("all");

  const logsQuery = createQuery(() => ({
    queryKey: ["server-logs"],
    queryFn: fetchServerLogs,
    refetchInterval: 5000, // Refresh every 5 seconds
  }));

  const filteredLogs = () => {
    const logs = logsQuery.data?.logs || [];
    const searchTerm = filter().toLowerCase();
    const level = levelFilter();

    return logs
      .filter((log: any) => {
        // Filter by level
        if (level !== "all" && log.level !== level) {
          return false;
        }
        // Filter by search term
        if (searchTerm && !log.message.toLowerCase().includes(searchTerm)) {
          return false;
        }
        return true;
      })
      .reverse(); // Show newest first
  };

  const getLevelBadgeClass = (level: string) => {
    switch (level) {
      case "error":
        return "badge-error";
      case "warn":
        return "badge-warning";
      case "info":
        return "badge-info";
      default:
        return "badge-ghost";
    }
  };

  return (
    <main class="min-h-screen bg-base-200">
      <div class="navbar bg-base-100 shadow-lg">
        <div class="flex-1">
          <A href="/" class="btn btn-ghost text-xl">
            Dashboard Server Admin
          </A>
          <span class="mx-2 text-gray-400">/</span>
          <span class="text-xl">Server Logs</span>
        </div>
      </div>
      <div class="p-4">
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <div class="flex flex-col md:flex-row gap-4 mb-4">
              <div class="form-control flex-1">
                <input
                  type="text"
                  placeholder="Search logs..."
                  class="input input-bordered"
                  value={filter()}
                  onInput={(e) => setFilter(e.currentTarget.value)}
                />
              </div>
              <div class="form-control">
                <select
                  class="select select-bordered"
                  value={levelFilter()}
                  onChange={(e) => setLevelFilter(e.currentTarget.value)}
                >
                  <option value="all">All Levels</option>
                  <option value="info">Info</option>
                  <option value="warn">Warning</option>
                  <option value="error">Error</option>
                </select>
              </div>
              <button
                class="btn btn-primary"
                onClick={() => logsQuery.refetch()}
              >
                Refresh
              </button>
            </div>

            <Show when={logsQuery.isLoading}>
              <div class="flex justify-center items-center py-8">
                <span class="loading loading-spinner loading-lg"></span>
              </div>
            </Show>

            <Show when={logsQuery.error}>
              <div class="alert alert-error mb-4">
                <span>Error loading server logs</span>
              </div>
            </Show>

            <Show when={!logsQuery.isLoading && !logsQuery.error}>
              <div class="overflow-x-auto">
                <table class="table table-zebra table-sm">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Level</th>
                      <th>Message</th>
                      <th>Request ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For
                      each={filteredLogs()}
                      fallback={
                        <tr>
                          <td colspan="4" class="text-center py-8 text-gray-500">
                            No logs found
                          </td>
                        </tr>
                      }
                    >
                      {(log) => (
                        <tr>
                          <td class="font-mono text-xs whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td>
                            <span
                              class={`badge badge-sm ${getLevelBadgeClass(
                                log.level
                              )}`}
                            >
                              {log.level}
                            </span>
                          </td>
                          <td class="font-mono text-xs break-all">
                            {log.message}
                          </td>
                          <td class="font-mono text-xs">{log.reqId || "-"}</td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
              <div class="text-sm text-gray-500 mt-4">
                Showing {filteredLogs().length} of {logsQuery.data?.logs.length || 0} logs
              </div>
            </Show>
          </div>
        </div>
      </div>
    </main>
  );
}
