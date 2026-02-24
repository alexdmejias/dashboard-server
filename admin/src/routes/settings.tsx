import {
  createForm,
  zodForm,
  setValues,
} from "@modular-forms/solid";
import { createQuery, useQueryClient } from "@tanstack/solid-query";
import {
  createSignal,
  For,
  Show,
  createMemo,
  createEffect,
} from "solid-js";
import { A } from "@solidjs/router";
import { fetchSettings, saveSettings } from "../lib/api";
import {
  SETTINGS_FIELDS,
  SETTINGS_GROUPS,
  settingsZodSchema,
  type SettingsFormValues,
  type FieldMeta,
} from "../../../src/plugins/settingsSchema";

// ── Types ──────────────────────────────────────────────────────────────────────

interface DiffEntry {
  field: FieldMeta;
  from: unknown;
  to: unknown;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Mask a sensitive value for display */
function maskValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "(empty)";
  const str = String(value);
  return str.length <= 4
    ? "••••"
    : `${str.slice(0, 2)}${"•".repeat(str.length - 4)}${str.slice(-2)}`;
}

/** Format a value for diff display */
function displayValue(meta: FieldMeta, value: unknown): string {
  if (value === undefined || value === null || value === "") return "(empty)";
  if (meta.sensitive) return maskValue(value);
  if (meta.type === "boolean") return value ? "true" : "false";
  return String(value);
}

/** Coerce raw API values to the types expected by the form */
function coerceSettings(raw: Record<string, unknown>): SettingsFormValues {
  const result: Record<string, unknown> = {};
  for (const field of SETTINGS_FIELDS) {
    const val = raw[field.name];
    if (val === undefined) continue;
    if (field.type === "number") {
      const num = typeof val === "number" ? val : Number(val);
      if (!Number.isNaN(num)) result[field.name] = num;
    } else if (field.type === "boolean") {
      result[field.name] = Boolean(val);
    } else {
      result[field.name] = val;
    }
  }
  return result as SettingsFormValues;
}

/** Build the diff between server values and submitted form values */
function buildDiff(
  server: Record<string, unknown>,
  submitted: SettingsFormValues,
): DiffEntry[] {
  const diff: DiffEntry[] = [];
  for (const field of SETTINGS_FIELDS) {
    const from = server[field.name];
    const to = (submitted as Record<string, unknown>)[field.name];
    const fromStr = from === undefined || from === null ? "" : String(from);
    const toStr = to === undefined || to === null ? "" : String(to);
    if (fromStr !== toStr) {
      diff.push({ field, from, to });
    }
  }
  return diff;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function DiffModal(props: {
  diff: DiffEntry[];
  onConfirm: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="card bg-base-100 shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        <div class="card-body flex flex-col overflow-hidden">
          <h3 class="card-title text-lg">Review Changes</h3>
          <p class="text-sm text-base-content/70 mb-3">
            The following settings will be updated. Please review before saving.
          </p>
          <div class="overflow-y-auto flex-1">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Current Value</th>
                  <th>New Value</th>
                </tr>
              </thead>
              <tbody>
                <For each={props.diff}>
                  {(entry) => (
                    <tr>
                      <td class="font-medium">{entry.field.label}</td>
                      <td class="font-mono text-xs text-error/80">
                        {displayValue(entry.field, entry.from)}
                      </td>
                      <td class="font-mono text-xs text-success">
                        {displayValue(entry.field, entry.to)}
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
          <div class="card-actions justify-end mt-4 gap-2">
            <button
              class="btn btn-ghost"
              onClick={props.onCancel}
              disabled={props.saving}
            >
              Cancel
            </button>
            <button
              class="btn btn-primary"
              onClick={props.onConfirm}
              disabled={props.saving}
            >
              <Show when={props.saving} fallback="Save Changes">
                <span class="loading loading-spinner loading-sm" />
                Saving…
              </Show>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Settings Page ─────────────────────────────────────────────────────────

export default function Settings() {
  const queryClient = useQueryClient();

  const settingsQuery = createQuery(() => ({
    queryKey: ["admin-settings"],
    queryFn: fetchSettings,
  }));

  const [form, { Form, Field }] = createForm<SettingsFormValues>({
    validate: zodForm(settingsZodSchema),
  });

  // Whether password fields are revealed
  const [revealed, setRevealed] = createSignal<Record<string, boolean>>({});

  // Diff to review before saving
  const [pendingDiff, setPendingDiff] = createSignal<DiffEntry[] | null>(null);
  const [pendingValues, setPendingValues] =
    createSignal<SettingsFormValues | null>(null);

  const [saveError, setSaveError] = createSignal<string | null>(null);
  const [saveSuccess, setSaveSuccess] = createSignal(false);
  const [saving, setSaving] = createSignal(false);

  /** Server values snapshot used for diff comparison */
  const serverValues = createMemo(
    () => (settingsQuery.data ?? {}) as Record<string, unknown>,
  );

  // Once the query succeeds, populate the form with server values
  createEffect(() => {
    const raw = settingsQuery.data;
    if (!raw) return;
    setValues(form, coerceSettings(raw as Record<string, unknown>));
  });

  const toggleReveal = (name: string) => {
    setRevealed((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const handleSubmit = async (values: SettingsFormValues) => {
    const diff = buildDiff(serverValues(), values);
    if (diff.length === 0) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      return;
    }
    setPendingValues(values);
    setPendingDiff(diff);
  };

  const confirmSave = async () => {
    const values = pendingValues();
    const diff = pendingDiff();
    if (!values || !diff) return;

    setSaving(true);
    setSaveError(null);

    try {
      // Only send the changed fields
      const patch: Record<string, unknown> = {};
      for (const entry of diff) {
        patch[entry.field.name] = (values as Record<string, unknown>)[
          entry.field.name
        ];
      }
      await saveSettings(patch);
      await queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      setPendingDiff(null);
      setPendingValues(null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const cancelSave = () => {
    setPendingDiff(null);
    setPendingValues(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main class="min-h-screen bg-base-200">
      {/* Navbar */}
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
        <Show when={settingsQuery.isLoading}>
          <div class="flex justify-center items-center py-16">
            <span class="loading loading-spinner loading-lg" />
          </div>
        </Show>

        <Show when={settingsQuery.isError}>
          <div class="alert alert-error">
            <span>Failed to load settings. Are you authenticated?</span>
          </div>
        </Show>

        <Show when={settingsQuery.isSuccess}>
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

          <Form onSubmit={handleSubmit}>
            <For each={SETTINGS_GROUPS}>
              {(group) => {
                const fields = SETTINGS_FIELDS.filter(
                  (f) => f.group === group,
                );
                return (
                  <div class="card bg-base-100 shadow-md mb-6">
                    <div class="card-body">
                      <h2 class="card-title text-base border-b pb-2 mb-2">
                        {group}
                      </h2>
                      <For each={fields}>
                        {(meta) => (
                          <div class="form-control mb-4">
                            <Show when={meta.type === "boolean"}>
                              <Field
                                name={meta.name as keyof SettingsFormValues}
                                type="boolean"
                              >
                                {(field, fieldProps) => (
                                  <>
                                    <label class="label cursor-pointer justify-start gap-4">
                                      <input
                                        {...fieldProps}
                                        type="checkbox"
                                        class="toggle toggle-primary"
                                        checked={field.value ?? false}
                                      />
                                      <span class="label-text font-medium">
                                        {meta.label}
                                      </span>
                                    </label>
                                    <label class="label">
                                      <span class="label-text-alt text-base-content/60">
                                        {meta.description}
                                      </span>
                                    </label>
                                    <Show when={field.error}>
                                      <label class="label">
                                        <span class="label-text-alt text-error">
                                          {field.error}
                                        </span>
                                      </label>
                                    </Show>
                                  </>
                                )}
                              </Field>
                            </Show>

                            <Show when={meta.type !== "boolean"}>
                              <label class="label">
                                <span class="label-text font-medium">
                                  {meta.label}
                                  <Show when={meta.sensitive}>
                                    <span class="badge badge-warning badge-xs ml-2">
                                      sensitive
                                    </span>
                                  </Show>
                                </span>
                              </label>

                              <Show when={meta.type === "select"}>
                                <Field
                                  name={
                                    meta.name as keyof SettingsFormValues
                                  }
                                >
                                  {(field, fieldProps) => (
                                    <>
                                      <select
                                        {...fieldProps}
                                        class="select select-bordered w-full"
                                        value={field.value as string}
                                      >
                                        <For each={meta.options ?? []}>
                                          {(opt) => (
                                            <option value={opt}>{opt}</option>
                                          )}
                                        </For>
                                      </select>
                                      <Show when={field.error}>
                                        <label class="label">
                                          <span class="label-text-alt text-error">
                                            {field.error}
                                          </span>
                                        </label>
                                      </Show>
                                    </>
                                  )}
                                </Field>
                              </Show>

                              <Show when={meta.type === "number"}>
                                <Field
                                  name={
                                    meta.name as keyof SettingsFormValues
                                  }
                                  type="number"
                                >
                                  {(field, fieldProps) => (
                                    <>
                                      <input
                                        {...fieldProps}
                                        type="number"
                                        class="input input-bordered w-full"
                                        value={field.value ?? 0}
                                        placeholder={meta.label}
                                      />
                                      <Show when={field.error}>
                                        <label class="label">
                                          <span class="label-text-alt text-error">
                                            {field.error}
                                          </span>
                                        </label>
                                      </Show>
                                    </>
                                  )}
                                </Field>
                              </Show>

                              <Show when={meta.type === "text"}>
                                <Field
                                  name={
                                    meta.name as keyof SettingsFormValues
                                  }
                                >
                                  {(field, fieldProps) => (
                                    <>
                                      <input
                                        {...fieldProps}
                                        type="text"
                                        class="input input-bordered w-full"
                                        value={field.value ?? ""}
                                        placeholder={meta.label}
                                      />
                                      <Show when={field.error}>
                                        <label class="label">
                                          <span class="label-text-alt text-error">
                                            {field.error}
                                          </span>
                                        </label>
                                      </Show>
                                    </>
                                  )}
                                </Field>
                              </Show>

                              <Show when={meta.type === "password"}>
                                <Field
                                  name={
                                    meta.name as keyof SettingsFormValues
                                  }
                                >
                                  {(field, fieldProps) => (
                                    <>
                                      <div class="join w-full">
                                        <input
                                          {...fieldProps}
                                          type={
                                            revealed()[meta.name]
                                              ? "text"
                                              : "password"
                                          }
                                          class="input input-bordered join-item flex-1"
                                          value={field.value ?? ""}
                                          placeholder={meta.label}
                                        />
                                        <button
                                          type="button"
                                          class="btn btn-outline join-item"
                                          onClick={() =>
                                            toggleReveal(meta.name)
                                          }
                                          title={
                                            revealed()[meta.name]
                                              ? "Hide"
                                              : "Reveal"
                                          }
                                        >
                                          {revealed()[meta.name]
                                            ? "Hide"
                                            : "Show"}
                                        </button>
                                      </div>
                                      <Show when={field.error}>
                                        <label class="label">
                                          <span class="label-text-alt text-error">
                                            {field.error}
                                          </span>
                                        </label>
                                      </Show>
                                    </>
                                  )}
                                </Field>
                              </Show>

                              <label class="label">
                                <span class="label-text-alt text-base-content/60">
                                  {meta.description}
                                </span>
                              </label>
                            </Show>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                );
              }}
            </For>

            <div class="flex justify-end mt-2 mb-8">
              <button
                type="submit"
                class="btn btn-primary btn-lg"
                disabled={form.submitting}
              >
                Review Changes
              </button>
            </div>
          </Form>
        </Show>
      </div>

      {/* Diff confirmation modal */}
      <Show when={pendingDiff()}>
        <DiffModal
          diff={pendingDiff()!}
          onConfirm={confirmSave}
          onCancel={cancelSave}
          saving={saving()}
        />
      </Show>
    </main>
  );
}

