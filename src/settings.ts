import fs from "node:fs";
import path from "node:path";
import { PROJECT_ROOT } from "./utils/projectRoot";

/**
 * Runtime-editable settings persisted in settings.json.
 *
 * API keys / tokens for third-party services live here so they can be updated
 * without a server restart.  ADMIN_PASSWORD and LOG_LEVEL are the only values
 * that must stay exclusively in .env.
 */
export type AppSettings = {
  // ── Operational settings ──────────────────────────────────────────────────
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

  // ── API keys / tokens ─────────────────────────────────────────────────────
  /** Weather API key (weatherapi.com) */
  weatherApiKey: string;
  /** Todoist API key */
  todoistApiKey: string;
  /** Google OAuth2 client ID */
  googleClientId: string;
  /** Google OAuth2 client secret */
  googleClientSecret: string;
  /** Google OAuth2 refresh token */
  googleRefreshToken: string;
  /** Cloudflare account ID for browser rendering */
  cloudflareAccountId: string;
  /** Cloudflare API token for browser rendering */
  cloudflareApiToken: string;
  /** Browserless.io API token */
  browserlessIoToken: string;
  /** Logtail / Better Stack source token */
  logtailSourceToken: string;
};

const DEFAULTS: AppSettings = {
  logtailEndpoint: "https://in.logs.betterstack.com",
  browserRenderer: "puppeteer",
  browserlessEndpoint: "",
  enableCloudflareBrowserRendering: false,
  enableBrowserlessIO: false,
  chromiumBin: "",
  maxImagesToKeep: 1000,
  weatherApiKey: "",
  todoistApiKey: "",
  googleClientId: "",
  googleClientSecret: "",
  googleRefreshToken: "",
  cloudflareAccountId: "",
  cloudflareApiToken: "",
  browserlessIoToken: "",
  logtailSourceToken: "",
};

const VALID_RENDERERS: AppSettings["browserRenderer"][] = [
  "puppeteer",
  "cloudflare",
  "browserless",
  "multi",
];

export { VALID_RENDERERS };

// ─── Internal state ──────────────────────────────────────────────────────────

let _settingsFilePath: string | null = null;
let _cache: AppSettings | null = null;

function getSettingsFilePath(): string {
  if (!_settingsFilePath) {
    // Allow a custom path via the SETTINGS_FILE environment variable
    _settingsFilePath = process.env.SETTINGS_FILE
      ? path.resolve(process.env.SETTINGS_FILE)
      : path.join(PROJECT_ROOT, "settings.json");
  }
  return _settingsFilePath;
}

function readFromDisk(): AppSettings | null {
  const filePath = getSettingsFilePath();
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as AppSettings;
  } catch {
    return null;
  }
}

function writeToDisk(settings: AppSettings): void {
  const filePath = getSettingsFilePath();
  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), "utf-8");
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns a snapshot of the current settings.
 * Safe to call synchronously at any point; returns defaults when called
 * before `initSettings()` has completed (e.g. during logger bootstrap).
 */
export function getSettings(): AppSettings {
  if (_cache) return { ..._cache };

  // Try to load from disk (handles the case where the file exists but
  // initSettings hasn't been called yet, e.g. in logger bootstrap).
  const onDisk = readFromDisk();
  if (onDisk) {
    _cache = onDisk;
    return { ..._cache };
  }

  // Synchronous fallback used only during very early bootstrap
  return { ...DEFAULTS };
}

/**
 * Initialise the settings store.  Must be called once at application startup
 * before any code that reads settings.  Idempotent – safe to call multiple times.
 */
export async function initSettings(): Promise<AppSettings> {
  if (_cache) return { ..._cache };

  const onDisk = readFromDisk();
  if (onDisk) {
    _cache = onDisk;
    return { ..._cache };
  }

  // First run: write defaults and persist
  writeToDisk(DEFAULTS);
  _cache = { ...DEFAULTS };
  return { ..._cache };
}

/**
 * Merge `patch` into the persisted settings and return the updated values.
 */
export async function updateSettings(
  patch: Partial<AppSettings>,
): Promise<AppSettings> {
  // Ensure we have a base to merge into
  if (!_cache) {
    await initSettings();
  }

  const updated: AppSettings = { ..._cache!, ...patch };
  writeToDisk(updated);
  _cache = updated;
  return { ...updated };
}

// ─── Test helpers ─────────────────────────────────────────────────────────────

/** @internal Reset module-level state – used in tests only. */
export function _resetForTesting(filePath?: string): void {
  _settingsFilePath = filePath ?? null;
  _cache = null;
}

