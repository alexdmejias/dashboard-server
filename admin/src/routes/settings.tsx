import {
  createQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/solid-query";
import { createSignal, For, Show } from "solid-js";
import { A } from "@solidjs/router";
import {
  fetchAdminSettings,
  fetchSettingsSchema,
  saveAdminSettings,
} from "../lib/api";

// ── Types inferred from the JSON Schema ────────────────────────────────────────

type SchemaPropertyType = "string" | "integer" | "number" | "boolean";

interface SchemaProperty {
  type: SchemaPropertyType;
  title: string;
  description?: string;
  default?: unknown;
  enum?: string[];
  minimum?: number;
  format?: string;
  /** Custom extension: render as password input and mask in diffs */
  "x-sensitive"?: boolean;
  /** Custom extension: section heading */
  "x-group"?: string;
}

interface SettingsSchema {
  properties: Record<string, SchemaProperty>;
}

// ── Validation using schema ────────────────────────────────────────────────────

function validatePatch(
  patch: Record<string, unknown>,
  schema: SettingsSchema,
): string[] {
  const errors: string[] = [];
  for (const [key, value] of Object.entries(patch)) {
    const prop = schema.properties[key];
    if (!prop) continue;

    if (prop.enum && !prop.enum.includes(value as string)) {
      errors.push(`"${prop.title}" must be one of: ${prop.enum.join(", ")}`);
    }

    if (prop.type === "integer" || prop.type === "number") {
      const n = Number(value);
      if (!Number.isFinite(n)) {
        errors.push(`"${prop.title}" must be a number`);
      } else if (prop.type === "integer" && !Number.isInteger(n)) {
        errors.push(`"${prop.title}" must be a whole number`);
      } else if (prop.minimum !== undefined && n < prop.minimum) {
        errors.push(`"${prop.title}" must be at least ${prop.minimum}`);
      }
    }

    if (prop.format === "uri" && value !== "" && typeof value === "string") {
      try {
        new URL(value);
      } catch {
        errors.push(`"${prop.title}" must be a valid URL`);
      }
    }
  }
  return errors;
}

// ── Diff helpers ───────────────────────────────────────────────────────────────

interface DiffEntry {
  key: string;
  title: string;
  sensitive: boolean;
  oldValue: unknown;
  newValue: unknown;
}

function computeDiff(
  current: Record<string, unknown>,
  incoming: Record<string, unknown>,
  schema: SettingsSchema,
): DiffEntry[] {
  return Object.entries(incoming)
    .filter(([key, val]) => String(current[key] ?? "") !== String(val ?? ""))
    .map(([key, val]) => ({
      key,
      title: schema.properties[key]?.title ?? key,
      sensitive: !!schema.properties[key]?.["x-sensitive"],
      oldValue: current[key],
      newValue: val,
    }));
}

function displayValue(value: unknown, sensitive: boolean): string {
  if (sensitive && value) return "••••••••";
  if (value === undefined || value === null || value === "") return "(empty)";
  return String(value);
}

// ── Grouped schema properties ─────────────────────────────────────────────────

function groupProperties(
  schema: SettingsSchema,
): Array<{ group: string; keys: string[] }> {
  const order: string[] = [];
  const groups: Record<string, string[]> = {};

  for (const [key, prop] of Object.entries(schema.properties)) {
    const g = prop["x-group"] ?? "Other";
    if (!groups[g]) {
      order.push(g);
      groups[g] = [];
    }
    groups[g].push(key);
  }

  return order.map((g) => ({ group: g, keys: groups[g] }));
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Settings() {
  const queryClient = useQueryClient();

  const schemaQuery = createQuery<SettingsSchema>(() => ({
    queryKey: ["settings-schema"],
    queryFn: fetchSettingsSchema,
    staleTime: Infinity, // schema never changes at runtime
  }));

  const settingsQuery = createQuery<Record<string, unknown>>(() => ({
    queryKey: ["admin-settings"],
    queryFn: fetchAdminSettings,
  }));

  const [form, setForm] = createSignal<Record<string, unknown>>({});
  const [formInitialised, setFormInitialised] = createSignal(false);
  const [validationErrors, setValidationErrors] = createSignal<string[]>([]);
  const [diff, setDiff] = createSignal<DiffEntry[]>([]);
  const [showDiff, setShowDiff] = createSignal(false);
  const [saveSuccess, setSaveSuccess] = createSignal(false);
  const [saveError, setSaveError] = createSignal<string | null>(null);

  // Initialise form once both schema and settings are loaded
  const getFormValue = (key: string) => {
    if (!formInitialised() && settingsQuery.data && schemaQuery.data) {
      setFormInitialised(true);
      setForm({ ...(settingsQuery.data as Record<string, unknown>) });
    }
    const f = form();
    return key in f ? f[key] : settingsQuery.data?.[key];
  };

  const setField = (key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaveSuccess(false);
    setSaveError(null);
  };

  const mutation = useMutation(() => ({
    mutationFn: (patch: Record<string, unknown>) => saveAdminSettings(patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      setFormInitialised(false);
      setShowDiff(false);
      setDiff([]);
      setSaveSuccess(true);
      setSaveError(null);
    },
    onError: (err: unknown) => {
      const e = err as { errors?: string[]; error?: string };
      setSaveError(
        e?.errors?.join("; ") ?? e?.error ?? "Failed to save settings",
      );
      setSaveSuccess(false);
    },
  }));

  const handleValidate = () => {
    const schema = schemaQuery.data;
    const current = settingsQuery.data;
    if (!schema || !current) return;

    const incoming = form();
    const errors = validatePatch(incoming, schema);
    setValidationErrors(errors);

    if (errors.length > 0) {
      setShowDiff(false);
      setDiff([]);
      return;
    }

    setDiff(computeDiff(current, incoming, schema));
    setShowDiff(true);
  };

  const handleConfirm = () => mutation.mutate(form());
  const handleCancelDiff = () => {
    setShowDiff(false);
    setDiff([]);
  };

  // ── Field renderers ──────────────────────────────────────────────────────────

  const renderField = (key: string, prop: SchemaProperty) => {
    const value = getFormValue(key);

    if (prop.type === "boolean") {
      return (
        <div class="form-control mb-4">
          <label class="label cursor-pointer justify-start gap-4">
            <input
              type="checkbox"
              class="toggle toggle-primary"
              checked={Boolean(value)}
              onChange={(e) => setField(key, e.currentTarget.checked)}
            />
            <span class="label-text font-semibold">{prop.title}</span>
          </label>
          <Show when={prop.description}>
            <p class="text-xs text-gray-500 mt-1">{prop.description}</p>
          </Show>
        </div>
      );
    }

    if (prop.enum) {
      return (
        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text font-semibold">{prop.title}</span>
          </label>
          <Show when={prop.description}>
            <p class="text-xs text-gray-500 mb-1">{prop.description}</p>
          </Show>
          <select
            class="select select-bordered w-full"
            value={String(value ?? prop.default ?? "")}
            onChange={(e) => setField(key, e.currentTarget.value)}
          >
            <For each={prop.enum!}>{(opt) => <option value={opt}>{opt}</option>}</For>
          </select>
        </div>
      );
    }

    if (prop.type === "integer" || prop.type === "number") {
      return (
        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text font-semibold">{prop.title}</span>
          </label>
          <Show when={prop.description}>
            <p class="text-xs text-gray-500 mb-1">{prop.description}</p>
          </Show>
          <input
            type="number"
            class="input input-bordered w-full"
            min={prop.minimum}
            value={String(value ?? prop.default ?? "")}
            onInput={(e) => setField(key, Number(e.currentTarget.value))}
          />
        </div>
      );
    }

    // string (sensitive or plain)
    return (
      <div class="form-control mb-4">
        <label class="label">
          <span class="label-text font-semibold">{prop.title}</span>
        </label>
        <Show when={prop.description}>
          <p class="text-xs text-gray-500 mb-1">{prop.description}</p>
        </Show>
        <input
          type={prop["x-sensitive"] ? "password" : "text"}
          class="input input-bordered w-full"
          value={String(value ?? "")}
          onInput={(e) => setField(key, e.currentTarget.value)}
        />
      </div>
    );
  };

  // ── JSX ───────────────────────────────────────────────────────────────────────

  return (
    <main class="min-h-screen bg-base-200">
      <div class="navbar bg-base-100 shadow-lg">
        <div class="flex-1">
          <A href="/" class="btn btn-ghost text-xl">
            Dashboard Server Admin
          </A>
          <span class="mx-2 text-gray-400">/</span>
          <span class="text-xl">Settings</span>
        </div>
      </div>

      <div class="p-4 max-w-3xl mx-auto">
        <Show when={schemaQuery.isLoading || settingsQuery.isLoading}>
          <div class="flex justify-center items-center py-8">
            <span class="loading loading-spinner loading-lg" />
          </div>
        </Show>

        <Show when={schemaQuery.error || settingsQuery.error}>
          <div class="alert alert-error mb-4">
            <span>Failed to load settings. Are you logged in?</span>
          </div>
        </Show>

        <Show when={schemaQuery.data && settingsQuery.data}>
          <Show when={saveSuccess()}>
            <div class="alert alert-success mb-4">
              <span>Settings saved successfully.</span>
            </div>
          </Show>

          <Show when={saveError()}>
            <div class="alert alert-error mb-4">
              <span>{saveError()}</span>
            </div>
          </Show>

          {/* ── Diff confirmation panel ───────────────────────────────────── */}
          <Show when={showDiff()}>
            <div class="card bg-base-100 shadow-xl mb-6">
              <div class="card-body">
                <h2 class="card-title text-lg">Review Changes</h2>
                <Show
                  when={diff().length > 0}
                  fallback={
                    <p class="text-sm text-gray-500">No changes detected.</p>
                  }
                >
                  <div class="overflow-x-auto">
                    <table class="table table-sm">
                      <thead>
                        <tr>
                          <th>Field</th>
                          <th>Current</th>
                          <th>New</th>
                        </tr>
                      </thead>
                      <tbody>
                        <For each={diff()}>
                          {(entry) => (
                            <tr>
                              <td class="font-medium">{entry.title}</td>
                              <td class="font-mono text-xs text-error">
                                {displayValue(entry.oldValue, entry.sensitive)}
                              </td>
                              <td class="font-mono text-xs text-success">
                                {displayValue(entry.newValue, entry.sensitive)}
                              </td>
                            </tr>
                          )}
                        </For>
                      </tbody>
                    </table>
                  </div>
                </Show>
                <div class="card-actions justify-end mt-4 gap-2">
                  <button
                    class="btn btn-ghost"
                    onClick={handleCancelDiff}
                    disabled={mutation.isPending}
                  >
                    Cancel
                  </button>
                  <button
                    class="btn btn-primary"
                    onClick={handleConfirm}
                    disabled={mutation.isPending || diff().length === 0}
                  >
                    <Show when={mutation.isPending} fallback="Confirm & Save">
                      <span class="loading loading-spinner loading-sm" />
                      Saving…
                    </Show>
                  </button>
                </div>
              </div>
            </div>
          </Show>

          {/* ── Settings form ──────────────────────────────────────────────── */}
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <For each={groupProperties(schemaQuery.data!)}>
                {(section, i) => (
                  <>
                    <Show when={i() > 0}>
                      <div class="divider">{section.group}</div>
                    </Show>
                    <Show when={i() === 0}>
                      <h2 class="card-title mb-4">{section.group}</h2>
                    </Show>
                    <For each={section.keys}>
                      {(key) =>
                        renderField(
                          key,
                          schemaQuery.data!.properties[key],
                        )
                      }
                    </For>
                  </>
                )}
              </For>

              <Show when={validationErrors().length > 0}>
                <div class="alert alert-error mt-2 mb-4">
                  <ul class="list-disc list-inside">
                    <For each={validationErrors()}>
                      {(err) => <li>{err}</li>}
                    </For>
                  </ul>
                </div>
              </Show>

              <div class="card-actions justify-end mt-4">
                <button
                  class="btn btn-primary"
                  onClick={handleValidate}
                  disabled={schemaQuery.isLoading || settingsQuery.isLoading}
                >
                  Validate &amp; Preview Changes
                </button>
              </div>
            </div>
          </div>
        </Show>
      </div>
    </main>
  );
}
