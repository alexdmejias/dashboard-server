import {
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";

const MAX_LINES = 1000;

const LEVEL_NAMES: Record<number, string> = {
  10: "trace",
  20: "debug",
  30: "info",
  40: "warn",
  50: "error",
  60: "fatal",
};

function levelName(level: number): string {
  return LEVEL_NAMES[level] ?? String(level);
}

function levelBadgeClass(level: number): string {
  if (level >= 50) return "badge-error";
  if (level >= 40) return "badge-warning";
  if (level >= 30) return "badge-info";
  return "badge-ghost";
}

interface ParsedLine {
  raw: string;
  parsed: Record<string, unknown> | null;
  level: number;
  time: number;
  msg: string;
  clientName: string | null;
  imageFileName: string | null;
  url: string | null;
  key: string;
}

let _keyCounter = 0;

function parseLine(raw: string): ParsedLine {
  const key = String(_keyCounter++);
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const req =
      parsed.req !== null && typeof parsed.req === "object"
        ? (parsed.req as Record<string, unknown>)
        : null;
    const url =
      typeof parsed.url === "string"
        ? parsed.url
        : req && typeof req.url === "string"
          ? req.url
          : null;
    return {
      raw,
      parsed,
      level: typeof parsed.level === "number" ? parsed.level : 30,
      time: typeof parsed.time === "number" ? parsed.time : 0,
      msg: typeof parsed.msg === "string" ? parsed.msg : raw,
      clientName:
        typeof parsed.clientName === "string" ? parsed.clientName : null,
      imageFileName:
        typeof parsed.imageFileName === "string" ? parsed.imageFileName : null,
      url,
      key,
    };
  } catch {
    return {
      raw,
      parsed: null,
      level: 30,
      time: 0,
      msg: raw,
      clientName: null,
      imageFileName: null,
      url: null,
      key,
    };
  }
}

function formatDetails(parsed: Record<string, unknown>): string {
  const {
    level: _l,
    time: _t,
    pid: _p,
    hostname: _h,
    msg: _m,
    ...rest
  } = parsed;
  return JSON.stringify(rest, null, 2);
}

function formatTime(ms: number): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  });
}

interface RawLogViewerProps {
  /** Pre-select a client name in the dropdown */
  initialClientName?: string;
}

export function RawLogViewer(props: RawLogViewerProps) {
  const [levelFilter, setLevelFilter] = createSignal<string>("all");
  const [clientFilter, setClientFilter] = createSignal<string>(
    props.initialClientName ?? "all",
  );
  const [search, setSearch] = createSignal("");
  const [hideAdminRequests, setHideAdminRequests] = createSignal(false);
  const [expanded, setExpanded] = createSignal<Set<string>>(new Set());
  const [lines, setLines] = createSignal<ParsedLine[]>([]);
  const [connected, setConnected] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  onMount(() => {
    const token = localStorage.getItem("adminToken") ?? "";
    const url = `/api/admin/logs/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);

    es.onopen = () => {
      setConnected(true);
      setError(null);
    };

    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as
          | { type: "snapshot"; lines: string[] }
          | { type: "line"; line: string };

        if (msg.type === "snapshot") {
          setLines(msg.lines.map(parseLine));
        } else {
          setLines((prev) => {
            const next = [parseLine(msg.line), ...prev];
            return next.length > MAX_LINES ? next.slice(0, MAX_LINES) : next;
          });
        }
      } catch (err) {
        console.error("SSE parse error", err);
      }
    };

    es.onerror = () => {
      setConnected(false);
      setError("Connection lost – browser will reconnect automatically");
    };

    onCleanup(() => es.close());
  });

  // Derive sorted unique client names from what's actually in the buffer.
  // Seed with initialClientName so the option exists before the SSE snapshot
  // arrives (otherwise the browser can't select a non-existent option).
  const knownClients = createMemo(() => {
    const names = new Set<string>();
    if (props.initialClientName) names.add(props.initialClientName);
    for (const entry of lines()) {
      if (entry.clientName) names.add(entry.clientName);
    }
    return Array.from(names).sort();
  });

  const filteredLines = createMemo(() => {
    const level = levelFilter();
    const client = clientFilter();
    const term = search().toLowerCase().trim();
    const filterAdmin = hideAdminRequests();

    return lines().filter((entry) => {
      if (level !== "all" && entry.level !== Number(level)) return false;
      if (client !== "all" && entry.clientName !== client) return false;
      if (term && !entry.raw.toLowerCase().includes(term)) return false;
      if (filterAdmin && entry.url !== null) {
        if (
          entry.url.startsWith("/api/admin/") ||
          entry.url.startsWith("/assets/")
        )
          return false;
      }
      return true;
    });
  });

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <div>
      <Show when={error()}>
        <div class="alert alert-warning mb-4">
          <span>{error()}</span>
        </div>
      </Show>

      {/* Connection badge */}
      <div class="flex justify-end mb-2">
        <div class="badge badge-lg">
          <Show
            when={connected()}
            fallback={<span class="text-error">Disconnected</span>}
          >
            <span class="text-success">Live</span>
          </Show>
        </div>
      </div>

      {/* Filters */}
      <div class="card bg-base-100 shadow mb-4">
        <div class="card-body py-3">
          <div class="flex flex-col sm:flex-row gap-3 items-end">
            <div class="form-control flex-1">
              <label class="label pb-1">
                <span class="label-text text-xs font-semibold uppercase tracking-wide">
                  Search
                </span>
              </label>
              <input
                type="text"
                placeholder="message, request ID, URL…"
                class="input input-bordered input-sm"
                value={search()}
                onInput={(e) => setSearch(e.currentTarget.value)}
              />
            </div>

            <div class="form-control w-48">
              <label class="label pb-1">
                <span class="label-text text-xs font-semibold uppercase tracking-wide">
                  Client
                </span>
              </label>
              <select
                class="select select-bordered select-sm"
                value={clientFilter()}
                onChange={(e) => setClientFilter(e.currentTarget.value)}
              >
                <option value="all">All clients</option>
                <For each={knownClients()}>
                  {(name) => <option value={name}>{name}</option>}
                </For>
              </select>
            </div>

            <div class="form-control w-40">
              <label class="label pb-1">
                <span class="label-text text-xs font-semibold uppercase tracking-wide">
                  Log level
                </span>
              </label>
              <select
                class="select select-bordered select-sm"
                value={levelFilter()}
                onChange={(e) => setLevelFilter(e.currentTarget.value)}
              >
                <option value="all">All levels</option>
                <option value="10">Trace</option>
                <option value="20">Debug</option>
                <option value="30">Info</option>
                <option value="40">Warn</option>
                <option value="50">Error</option>
                <option value="60">Fatal</option>
              </select>
            </div>
          </div>

          <div class="flex items-center gap-2 mt-2">
            <input
              id="hide-admin-requests"
              type="checkbox"
              class="checkbox checkbox-sm"
              checked={hideAdminRequests()}
              onChange={(e) => setHideAdminRequests(e.currentTarget.checked)}
            />
            <label
              for="hide-admin-requests"
              class="label-text text-xs cursor-pointer select-none"
            >
              Hide admin dashboard requests
            </label>
          </div>
        </div>
      </div>

      {/* Log list */}
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body p-0">
          <Show when={lines().length === 0 && connected()}>
            <div class="flex justify-center items-center py-16">
              <span class="loading loading-spinner loading-lg" />
            </div>
          </Show>

          <Show when={lines().length > 0 || !connected()}>
            <div class="overflow-x-auto">
              <table class="table table-sm w-full">
                <thead>
                  <tr>
                    <th class="w-40">Time</th>
                    <th class="w-20">Level</th>
                    <th class="w-32">Client</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  <For
                    each={filteredLines()}
                    fallback={
                      <tr>
                        <td
                          colSpan="4"
                          class="text-center py-12 text-base-content/50"
                        >
                          No log lines match the current filters
                        </td>
                      </tr>
                    }
                  >
                    {(entry) => {
                      const isOpen = () => expanded().has(entry.key);
                      const hasDetails = () =>
                        entry.parsed !== null &&
                        Object.keys(entry.parsed).some(
                          (k) =>
                            ![
                              "level",
                              "time",
                              "pid",
                              "hostname",
                              "msg",
                            ].includes(k),
                        );

                      return (
                        <>
                          <tr
                            class="hover cursor-pointer select-none"
                            classList={{
                              "bg-error/5": entry.level >= 50,
                              "bg-warning/5":
                                entry.level >= 40 && entry.level < 50,
                              "bg-base-200": isOpen(),
                            }}
                            onClick={() => toggleExpanded(entry.key)}
                          >
                            <td class="font-mono text-xs whitespace-nowrap opacity-70">
                              {formatTime(entry.time)}
                            </td>
                            <td>
                              <span
                                class={`badge badge-xs ${levelBadgeClass(entry.level)}`}
                              >
                                {levelName(entry.level)}
                              </span>
                            </td>
                            <td class="font-mono text-xs opacity-70 truncate max-w-[8rem]">
                              {entry.clientName ?? "—"}
                            </td>
                            <td class="font-mono text-xs">
                              <div class="flex items-start gap-2">
                                <span class="flex-1 break-all">
                                  {entry.msg}
                                </span>
                                <Show when={entry.imageFileName}>
                                  <a
                                    href={`/api/images/${entry.imageFileName}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="badge badge-sm badge-outline shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                    title="View rendered image"
                                  >
                                    🖼️ image
                                  </a>
                                </Show>
                                <Show when={hasDetails()}>
                                  <span class="text-base-content/40 text-xs shrink-0 mt-0.5">
                                    {isOpen() ? "▲" : "▼"}
                                  </span>
                                </Show>
                              </div>
                            </td>
                          </tr>

                          <Show when={isOpen() && entry.parsed !== null}>
                            <tr>
                              <td colSpan="4" class="bg-base-200 p-0">
                                <pre class="font-mono text-xs p-4 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                                  {formatDetails(entry.parsed!)}
                                </pre>
                              </td>
                            </tr>
                          </Show>
                        </>
                      );
                    }}
                  </For>
                </tbody>
              </table>
            </div>

            <div class="text-xs text-base-content/50 p-3 border-t border-base-200">
              Showing {filteredLines().length} of {lines().length} lines
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
}
