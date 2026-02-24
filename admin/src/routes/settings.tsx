import { createQuery, useMutation, useQueryClient } from "@tanstack/solid-query";
import { createSignal, For, Show } from "solid-js";
import { A } from "@solidjs/router";
import { fetchAdminSettings, updateAdminSettings } from "../lib/api";

const VALID_RENDERERS = ["puppeteer", "cloudflare", "browserless", "multi"] as const;
type BrowserRenderer = (typeof VALID_RENDERERS)[number];

type AppSettings = {
  logtailEndpoint: string;
  browserRenderer: BrowserRenderer;
  browserlessEndpoint: string;
  enableCloudflareBrowserRendering: boolean;
  enableBrowserlessIO: boolean;
  chromiumBin: string;
  maxImagesToKeep: number;
  weatherApiKey?: string;
  todoistApiKey?: string;
  googleClientId?: string;
  googleClientSecret?: string;
  googleRefreshToken?: string;
  cloudflareAccountId?: string;
  cloudflareApiToken?: string;
  browserlessIoToken?: string;
  logtailSourceToken?: string;
};

type DiffEntry = {
  key: string;
  label: string;
  oldValue: unknown;
  newValue: unknown;
};

const FIELD_LABELS: Record<keyof AppSettings, string> = {
  logtailEndpoint: "Logtail Endpoint",
  browserRenderer: "Browser Renderer",
  browserlessEndpoint: "Browserless Endpoint",
  enableCloudflareBrowserRendering: "Enable Cloudflare Browser Rendering",
  enableBrowserlessIO: "Enable Browserless.io",
  chromiumBin: "Chromium Binary Path",
  maxImagesToKeep: "Max Images to Keep",
  weatherApiKey: "Weather API Key",
  todoistApiKey: "Todoist API Key",
  googleClientId: "Google Client ID",
  googleClientSecret: "Google Client Secret",
  googleRefreshToken: "Google Refresh Token",
  cloudflareAccountId: "Cloudflare Account ID",
  cloudflareApiToken: "Cloudflare API Token",
  browserlessIoToken: "Browserless.io Token",
  logtailSourceToken: "Logtail Source Token",
};

const SENSITIVE_FIELDS = new Set([
  "weatherApiKey",
  "todoistApiKey",
  "googleClientSecret",
  "googleRefreshToken",
  "cloudflareApiToken",
  "browserlessIoToken",
  "logtailSourceToken",
]);

function maskSensitive(key: string, value: unknown): string {
  if (SENSITIVE_FIELDS.has(key) && value) {
    return "••••••••";
  }
  return String(value ?? "");
}

function computeDiff(
  current: AppSettings,
  incoming: Partial<AppSettings>,
): DiffEntry[] {
  return Object.entries(incoming)
    .filter(([key, newVal]) => {
      const oldVal = current[key as keyof AppSettings];
      return String(oldVal ?? "") !== String(newVal ?? "");
    })
    .map(([key, newVal]) => ({
      key,
      label: FIELD_LABELS[key as keyof AppSettings] ?? key,
      oldValue: current[key as keyof AppSettings],
      newValue: newVal,
    }));
}

function validate(form: Partial<AppSettings>): string[] {
  const errors: string[] = [];
  if (
    form.browserRenderer !== undefined &&
    !VALID_RENDERERS.includes(form.browserRenderer as BrowserRenderer)
  ) {
    errors.push(
      `browserRenderer must be one of: ${VALID_RENDERERS.join(", ")}`,
    );
  }
  if (form.maxImagesToKeep !== undefined) {
    const n = Number(form.maxImagesToKeep);
    if (!Number.isFinite(n) || n < 1) {
      errors.push("maxImagesToKeep must be a positive integer");
    }
  }
  return errors;
}

export default function Settings() {
  const queryClient = useQueryClient();

  const settingsQuery = createQuery<AppSettings>(() => ({
    queryKey: ["admin-settings"],
    queryFn: fetchAdminSettings,
  }));

  // form state (tracks user edits)
  const [form, setForm] = createSignal<Partial<AppSettings>>({});
  const [validationErrors, setValidationErrors] = createSignal<string[]>([]);
  const [diff, setDiff] = createSignal<DiffEntry[]>([]);
  const [showDiff, setShowDiff] = createSignal(false);
  const [saveError, setSaveError] = createSignal<string | null>(null);
  const [saveSuccess, setSaveSuccess] = createSignal(false);

  // Initialise form once data loads (only on first successful load)
  let formInitialised = false;
  const getFormValue = (key: keyof AppSettings) => {
    if (!formInitialised && settingsQuery.data) {
      formInitialised = true;
      setForm({ ...(settingsQuery.data as AppSettings) });
    }
    const f = form();
    if (key in f) return f[key];
    return settingsQuery.data?.[key];
  };

  const setField = (key: keyof AppSettings, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaveSuccess(false);
    setSaveError(null);
  };

  const mutation = useMutation(() => ({
    mutationFn: (patch: Partial<AppSettings>) => updateAdminSettings(patch as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      formInitialised = false;
      setShowDiff(false);
      setDiff([]);
      setSaveSuccess(true);
      setSaveError(null);
    },
    onError: (err: any) => {
      const msg =
        err?.errors?.join("; ") ??
        err?.error ??
        "Failed to save settings";
      setSaveError(msg);
      setSaveSuccess(false);
    },
  }));

  const handleValidate = () => {
    const current = settingsQuery.data;
    if (!current) return;

    const incoming = form();
    const errors = validate(incoming);
    setValidationErrors(errors);

    if (errors.length > 0) {
      setShowDiff(false);
      setDiff([]);
      return;
    }

    const changes = computeDiff(current, incoming);
    setDiff(changes);
    setShowDiff(true);
  };

  const handleConfirm = () => {
    mutation.mutate(form());
  };

  const handleCancelDiff = () => {
    setShowDiff(false);
    setDiff([]);
  };

  const textInput = (key: keyof AppSettings, type = "text") => (
    <input
      type={type}
      class="input input-bordered w-full"
      value={String(getFormValue(key) ?? "")}
      onInput={(e) => setField(key, e.currentTarget.value)}
    />
  );

  const checkboxInput = (key: keyof AppSettings) => (
    <input
      type="checkbox"
      class="toggle toggle-primary"
      checked={Boolean(getFormValue(key))}
      onChange={(e) => setField(key, e.currentTarget.checked)}
    />
  );

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
        <Show when={settingsQuery.isLoading}>
          <div class="flex justify-center items-center py-8">
            <span class="loading loading-spinner loading-lg" />
          </div>
        </Show>

        <Show when={settingsQuery.error}>
          <div class="alert alert-error mb-4">
            <span>Failed to load settings. Are you logged in?</span>
          </div>
        </Show>

        <Show when={settingsQuery.data}>
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

          {/* Diff confirmation panel */}
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
                              <td class="font-medium">{entry.label}</td>
                              <td class="font-mono text-xs text-error">
                                {maskSensitive(
                                  entry.key,
                                  entry.oldValue,
                                )}
                              </td>
                              <td class="font-mono text-xs text-success">
                                {maskSensitive(
                                  entry.key,
                                  entry.newValue,
                                )}
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
                    <Show
                      when={mutation.isPending}
                      fallback="Confirm & Save"
                    >
                      <span class="loading loading-spinner loading-sm" />
                      Saving…
                    </Show>
                  </button>
                </div>
              </div>
            </div>
          </Show>

          {/* Settings form */}
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">General Settings</h2>

              {/* Operational settings */}
              <div class="form-control mb-4">
                <label class="label">
                  <span class="label-text font-semibold">
                    {FIELD_LABELS.browserRenderer}
                  </span>
                </label>
                <select
                  class="select select-bordered w-full"
                  value={String(getFormValue("browserRenderer") ?? "puppeteer")}
                  onChange={(e) =>
                    setField("browserRenderer", e.currentTarget.value as BrowserRenderer)
                  }
                >
                  <For each={VALID_RENDERERS}>
                    {(r) => <option value={r}>{r}</option>}
                  </For>
                </select>
              </div>

              <div class="form-control mb-4">
                <label class="label">
                  <span class="label-text font-semibold">
                    {FIELD_LABELS.maxImagesToKeep}
                  </span>
                </label>
                <input
                  type="number"
                  class="input input-bordered w-full"
                  min="1"
                  value={String(getFormValue("maxImagesToKeep") ?? 1000)}
                  onInput={(e) =>
                    setField("maxImagesToKeep", Number(e.currentTarget.value))
                  }
                />
              </div>

              <div class="form-control mb-4">
                <label class="label">
                  <span class="label-text font-semibold">
                    {FIELD_LABELS.logtailEndpoint}
                  </span>
                </label>
                {textInput("logtailEndpoint")}
              </div>

              <div class="form-control mb-4">
                <label class="label">
                  <span class="label-text font-semibold">
                    {FIELD_LABELS.browserlessEndpoint}
                  </span>
                </label>
                {textInput("browserlessEndpoint")}
              </div>

              <div class="form-control mb-4">
                <label class="label cursor-pointer justify-start gap-4">
                  <span class="label-text font-semibold">
                    {FIELD_LABELS.enableCloudflareBrowserRendering}
                  </span>
                  {checkboxInput("enableCloudflareBrowserRendering")}
                </label>
              </div>

              <div class="form-control mb-4">
                <label class="label cursor-pointer justify-start gap-4">
                  <span class="label-text font-semibold">
                    {FIELD_LABELS.enableBrowserlessIO}
                  </span>
                  {checkboxInput("enableBrowserlessIO")}
                </label>
              </div>

              <div class="form-control mb-4">
                <label class="label">
                  <span class="label-text font-semibold">
                    {FIELD_LABELS.chromiumBin}
                  </span>
                </label>
                {textInput("chromiumBin")}
              </div>

              <div class="divider">API Keys</div>

              <div class="form-control mb-4">
                <label class="label">
                  <span class="label-text font-semibold">
                    {FIELD_LABELS.weatherApiKey}
                  </span>
                </label>
                {textInput("weatherApiKey", "password")}
              </div>

              <div class="form-control mb-4">
                <label class="label">
                  <span class="label-text font-semibold">
                    {FIELD_LABELS.todoistApiKey}
                  </span>
                </label>
                {textInput("todoistApiKey", "password")}
              </div>

              <div class="form-control mb-4">
                <label class="label">
                  <span class="label-text font-semibold">
                    {FIELD_LABELS.googleClientId}
                  </span>
                </label>
                {textInput("googleClientId")}
              </div>

              <div class="form-control mb-4">
                <label class="label">
                  <span class="label-text font-semibold">
                    {FIELD_LABELS.googleClientSecret}
                  </span>
                </label>
                {textInput("googleClientSecret", "password")}
              </div>

              <div class="form-control mb-4">
                <label class="label">
                  <span class="label-text font-semibold">
                    {FIELD_LABELS.googleRefreshToken}
                  </span>
                </label>
                {textInput("googleRefreshToken", "password")}
              </div>

              <div class="form-control mb-4">
                <label class="label">
                  <span class="label-text font-semibold">
                    {FIELD_LABELS.cloudflareAccountId}
                  </span>
                </label>
                {textInput("cloudflareAccountId")}
              </div>

              <div class="form-control mb-4">
                <label class="label">
                  <span class="label-text font-semibold">
                    {FIELD_LABELS.cloudflareApiToken}
                  </span>
                </label>
                {textInput("cloudflareApiToken", "password")}
              </div>

              <div class="form-control mb-4">
                <label class="label">
                  <span class="label-text font-semibold">
                    {FIELD_LABELS.browserlessIoToken}
                  </span>
                </label>
                {textInput("browserlessIoToken", "password")}
              </div>

              <div class="form-control mb-4">
                <label class="label">
                  <span class="label-text font-semibold">
                    {FIELD_LABELS.logtailSourceToken}
                  </span>
                </label>
                {textInput("logtailSourceToken", "password")}
              </div>

              <Show when={validationErrors().length > 0}>
                <div class="alert alert-error mb-4">
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
                  disabled={settingsQuery.isLoading}
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
