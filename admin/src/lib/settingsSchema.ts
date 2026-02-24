import { z } from "zod";

/**
 * Metadata schema for a single settings field.
 * The form is built programmatically from this list – the UI never
 * enumerates individual fields by name.
 */
export interface FieldMeta {
  /** Key in AppSettings */
  name: string;
  /** Human-readable label */
  label: string;
  /** Longer description shown below the input */
  description: string;
  /** Logical group for display */
  group: string;
  /** Input type rendered in the form */
  type: "text" | "password" | "number" | "boolean" | "select";
  /** Whether the field contains sensitive data (masked by default) */
  sensitive: boolean;
  /** Allowed values for "select" type */
  options?: string[];
}

export const SETTINGS_FIELDS: FieldMeta[] = [
  // ── Browser rendering ──────────────────────────────────────────────────────
  {
    name: "browserRenderer",
    label: "Browser Renderer",
    description:
      "Which browser renderer to use for screenshot generation. Use 'multi' to enable multiple renderers simultaneously.",
    group: "Browser Rendering",
    type: "select",
    sensitive: false,
    options: ["puppeteer", "cloudflare", "browserless", "multi"],
  },
  {
    name: "chromiumBin",
    label: "Chromium Binary Path",
    description:
      "Absolute path to a custom Chromium binary. Only used by the Puppeteer renderer.",
    group: "Browser Rendering",
    type: "text",
    sensitive: false,
  },
  {
    name: "browserlessEndpoint",
    label: "Browserless Endpoint",
    description: "Full URL of your Browserless.io instance (e.g. wss://…).",
    group: "Browser Rendering",
    type: "text",
    sensitive: false,
  },
  {
    name: "browserlessIoToken",
    label: "Browserless.io API Token",
    description: "API token for authenticating with Browserless.io.",
    group: "Browser Rendering",
    type: "password",
    sensitive: true,
  },
  {
    name: "enableCloudflareBrowserRendering",
    label: "Enable Cloudflare Browser Rendering",
    description:
      "Include Cloudflare browser rendering when running in multi-renderer mode.",
    group: "Browser Rendering",
    type: "boolean",
    sensitive: false,
  },
  {
    name: "enableBrowserlessIO",
    label: "Enable Browserless.io",
    description: "Include Browserless.io when running in multi-renderer mode.",
    group: "Browser Rendering",
    type: "boolean",
    sensitive: false,
  },

  // ── Image storage ──────────────────────────────────────────────────────────
  {
    name: "maxImagesToKeep",
    label: "Max Images to Keep",
    description:
      "Maximum number of generated screenshots to retain in the temp directory before the oldest are pruned.",
    group: "Image Storage",
    type: "number",
    sensitive: false,
  },

  // ── Logging ────────────────────────────────────────────────────────────────
  {
    name: "logtailEndpoint",
    label: "Logtail Ingest Endpoint",
    description:
      "Custom Logtail / Better Stack ingest URL. Defaults to https://in.logs.betterstack.com.",
    group: "Logging",
    type: "text",
    sensitive: false,
  },
  {
    name: "logtailSourceToken",
    label: "Logtail Source Token",
    description: "Source token used to authenticate with the Logtail service.",
    group: "Logging",
    type: "password",
    sensitive: true,
  },

  // ── Weather ────────────────────────────────────────────────────────────────
  {
    name: "weatherApiKey",
    label: "Weather API Key",
    description: "API key for the weather data provider.",
    group: "Integrations",
    type: "password",
    sensitive: true,
  },

  // ── Todoist ────────────────────────────────────────────────────────────────
  {
    name: "todoistApiKey",
    label: "Todoist API Key",
    description: "Personal API token for the Todoist integration.",
    group: "Integrations",
    type: "password",
    sensitive: true,
  },

  // ── Cloudflare ─────────────────────────────────────────────────────────────
  {
    name: "cloudflareAccountId",
    label: "Cloudflare Account ID",
    description:
      "Cloudflare account identifier required for browser rendering.",
    group: "Cloudflare",
    type: "text",
    sensitive: false,
  },
  {
    name: "cloudflareApiToken",
    label: "Cloudflare API Token",
    description: "API token with Workers AI / Browser Rendering permissions.",
    group: "Cloudflare",
    type: "password",
    sensitive: true,
  },

  // ── Google ─────────────────────────────────────────────────────────────────
  {
    name: "googleClientId",
    label: "Google Client ID",
    description: "OAuth 2.0 client ID from the Google Cloud Console.",
    group: "Google",
    type: "text",
    sensitive: false,
  },
  {
    name: "googleClientSecret",
    label: "Google Client Secret",
    description: "OAuth 2.0 client secret from the Google Cloud Console.",
    group: "Google",
    type: "password",
    sensitive: true,
  },
  {
    name: "googleRefreshToken",
    label: "Google Refresh Token",
    description:
      "Long-lived OAuth 2.0 refresh token used to obtain access tokens.",
    group: "Google",
    type: "password",
    sensitive: true,
  },
];

/** Groups in display order */
export const SETTINGS_GROUPS = [
  ...new Set(SETTINGS_FIELDS.map((f) => f.group)),
];

/**
 * Zod schema derived from SETTINGS_FIELDS.
 * Every field is optional so that partial updates are accepted.
 */
export const settingsZodSchema = z.object({
  browserRenderer: z
    .enum(["puppeteer", "cloudflare", "browserless", "multi"])
    .optional(),
  chromiumBin: z.string().optional(),
  browserlessEndpoint: z.string().optional(),
  browserlessIoToken: z.string().optional(),
  enableCloudflareBrowserRendering: z.boolean().optional(),
  enableBrowserlessIO: z.boolean().optional(),
  maxImagesToKeep: z
    .number({ invalid_type_error: "Must be a number" })
    .int("Must be a whole number")
    .min(1, "Must be at least 1")
    .optional(),
  logtailEndpoint: z
    .string()
    .url("Must be a valid URL")
    .or(z.literal(""))
    .optional(),
  logtailSourceToken: z.string().optional(),
  weatherApiKey: z.string().optional(),
  todoistApiKey: z.string().optional(),
  cloudflareAccountId: z.string().optional(),
  cloudflareApiToken: z.string().optional(),
  googleClientId: z.string().optional(),
  googleClientSecret: z.string().optional(),
  googleRefreshToken: z.string().optional(),
});

export type SettingsFormValues = z.infer<typeof settingsZodSchema>;
