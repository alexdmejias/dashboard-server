import path from "node:path";
import { JSONFileSyncPreset } from "lowdb/node";
import { PROJECT_ROOT } from "./utils/projectRoot";

/**
 * Runtime-editable settings persisted via lowdb (JSON file).
 *
 * Operational fields always have defaults and are guaranteed to be present.
 * API key fields are optional – they are absent until explicitly configured
 * via PUT /api/settings.  ADMIN_PASSWORD and LOG_LEVEL are env-only.
 */
export type AppSettings = {
  // ── Operational settings (always present, have defaults) ─────────────────
  /** Optional custom Logtail / Better Stack ingest endpoint */
  logtailEndpoint: string;
  /** Which browser renderer to use for screenshot generation */
  browserRenderer: "puppeteer" | "cloudflare" | "browserless" | "multi";
  /** Browserless.io endpoint URL */
  browserlessEndpoint: string;
  /** Enable Cloudflare browser rendering in multi-renderer mode */
  enableCloudflareBrowserRendering: boolean;
  /** Enable Browserless.io in multi-renderer mode */
  enableBrowserlessIO: boolean;
  /** Path to a custom Chromium binary (puppeteer renderer only) */
  chromiumBin: string;
  /** Maximum number of generated images to keep in the temp directory */
  maxImagesToKeep: number;

  // ── API keys / tokens (optional – absent until configured) ────────────────
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

/**
 * JSON Schema (Draft-07) for AppSettings.
 *
 * Standard keywords drive server-side validation.
 * Custom `x-` extensions are consumed by the admin UI:
 *   x-sensitive – render as password input; mask value in diffs
 *   x-group     – section heading used to group related fields
 */
export const SETTINGS_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Application Settings",
  type: "object" as const,
  properties: {
    // ── General ──────────────────────────────────────────────────────────────
    browserRenderer: {
      type: "string" as const,
      title: "Browser Renderer",
      description: "Which browser renderer to use for screenshot generation.",
      enum: ["puppeteer", "cloudflare", "browserless", "multi"],
      default: "puppeteer",
      "x-group": "General",
    },
    maxImagesToKeep: {
      type: "integer" as const,
      title: "Max Images to Keep",
      description:
        "Maximum number of generated images to keep in the temp directory.",
      minimum: 1,
      default: 1000,
      "x-group": "General",
    },
    chromiumBin: {
      type: "string" as const,
      title: "Chromium Binary Path",
      description: "Path to a custom Chromium binary (puppeteer renderer only).",
      default: "",
      "x-group": "General",
    },
    enableCloudflareBrowserRendering: {
      type: "boolean" as const,
      title: "Enable Cloudflare Browser Rendering",
      description: "Enable Cloudflare browser rendering in multi-renderer mode.",
      default: false,
      "x-group": "General",
    },
    enableBrowserlessIO: {
      type: "boolean" as const,
      title: "Enable Browserless.io",
      description: "Enable Browserless.io in multi-renderer mode.",
      default: false,
      "x-group": "General",
    },
    browserlessEndpoint: {
      type: "string" as const,
      title: "Browserless Endpoint",
      description: "Browserless.io endpoint URL.",
      format: "uri",
      default: "",
      "x-group": "General",
    },
    // ── Logging ───────────────────────────────────────────────────────────────
    logtailEndpoint: {
      type: "string" as const,
      title: "Logtail Endpoint",
      description: "Custom Logtail / Better Stack ingest endpoint.",
      format: "uri",
      default: "https://in.logs.betterstack.com",
      "x-group": "Logging",
    },
    logtailSourceToken: {
      type: "string" as const,
      title: "Logtail Source Token",
      description: "Logtail / Better Stack source token.",
      "x-sensitive": true,
      "x-group": "Logging",
    },
    // ── API Keys ──────────────────────────────────────────────────────────────
    weatherApiKey: {
      type: "string" as const,
      title: "Weather API Key",
      "x-sensitive": true,
      "x-group": "API Keys",
    },
    todoistApiKey: {
      type: "string" as const,
      title: "Todoist API Key",
      "x-sensitive": true,
      "x-group": "API Keys",
    },
    // ── Google OAuth ──────────────────────────────────────────────────────────
    googleClientId: {
      type: "string" as const,
      title: "Google Client ID",
      "x-group": "Google OAuth",
    },
    googleClientSecret: {
      type: "string" as const,
      title: "Google Client Secret",
      "x-sensitive": true,
      "x-group": "Google OAuth",
    },
    googleRefreshToken: {
      type: "string" as const,
      title: "Google Refresh Token",
      "x-sensitive": true,
      "x-group": "Google OAuth",
    },
    // ── Cloudflare ────────────────────────────────────────────────────────────
    cloudflareAccountId: {
      type: "string" as const,
      title: "Cloudflare Account ID",
      "x-group": "Cloudflare",
    },
    cloudflareApiToken: {
      type: "string" as const,
      title: "Cloudflare API Token",
      "x-sensitive": true,
      "x-group": "Cloudflare",
    },
    // ── Browserless.io ────────────────────────────────────────────────────────
    browserlessIoToken: {
      type: "string" as const,
      title: "Browserless.io Token",
      "x-sensitive": true,
      "x-group": "Browserless.io",
    },
  },
} as const;

/** Convenience type inferred from the schema's property keys. */
export type SettingsPropertyKey = keyof typeof SETTINGS_SCHEMA.properties;

const DEFAULTS: AppSettings = {
  logtailEndpoint: "https://in.logs.betterstack.com",
  browserRenderer: "puppeteer",
  browserlessEndpoint: "",
  enableCloudflareBrowserRendering: false,
  enableBrowserlessIO: false,
  chromiumBin: "",
  maxImagesToKeep: 1000,
};

const VALID_RENDERERS: AppSettings["browserRenderer"][] = [
  "puppeteer",
  "cloudflare",
  "browserless",
  "multi",
];

export { VALID_RENDERERS };

// ─── Internal state ──────────────────────────────────────────────────────────

let _db: ReturnType<typeof JSONFileSyncPreset<AppSettings>> | null = null;
// Explicit path override – set by _resetForTesting() in tests
let _settingsFilePath: string | null = null;

function getSettingsFilePath(): string {
  if (_settingsFilePath) return _settingsFilePath;
  if (process.env.SETTINGS_FILE) return path.resolve(process.env.SETTINGS_FILE);
  return path.join(PROJECT_ROOT, "settings.json");
}

function getDB() {
  if (!_db) {
    _db = JSONFileSyncPreset<AppSettings>(getSettingsFilePath(), DEFAULTS);
    // Merge DEFAULTS with on-disk data so any newly-added operational fields
    // get their default value even when reading an older settings.json.
    _db.data = { ...DEFAULTS, ..._db.data };
  }
  return _db;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns a snapshot of the current settings.
 * Safe to call synchronously at any point – lowdb initialises the db on first
 * access, reading from disk (or using in-memory storage in NODE_ENV=test).
 */
export function getSettings(): AppSettings {
  return { ...getDB().data };
}

/**
 * Initialise the settings store and ensure the file is persisted.
 * Must be called once at application startup.  Idempotent.
 */
export async function initSettings(): Promise<AppSettings> {
  const db = getDB();
  db.write(); // creates the file on first run (no-op with in-memory adapter)
  return { ...db.data };
}

/**
 * Merge `patch` into the persisted settings and return the updated values.
 */
export async function updateSettings(
  patch: Partial<AppSettings>,
): Promise<AppSettings> {
  const db = getDB();
  Object.assign(db.data, patch);
  db.write();
  return { ...db.data };
}

// ─── Test helpers ─────────────────────────────────────────────────────────────

/** @internal Reset module-level state – used in tests only. */
export function _resetForTesting(filePath?: string): void {
  _db = null;
  _settingsFilePath = filePath ?? null;
}

