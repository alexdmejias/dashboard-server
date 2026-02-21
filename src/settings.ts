import fs from "node:fs";
import path from "node:path";
import { PROJECT_ROOT } from "./utils/projectRoot";

/**
 * Operational settings that can be changed at runtime without a server restart.
 *
 * API keys and tokens can be stored here OR in the .env file.
 * Settings take precedence over environment variables when both are present.
 * The only value that must stay exclusively in .env is ADMIN_PASSWORD.
 */
export type AppSettings = {
  // ── Operational settings ──────────────────────────────────────────────────
  /** Pino log level (trace | debug | info | warn | error | fatal | silent) */
  logLevel: string;
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

  // ── API keys / tokens (can be set here instead of, or in addition to, .env) ──
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
  logLevel: "warn",
  logtailEndpoint: "https://in.logs.betterstack.com",
  browserRenderer: "puppeteer",
  browserlessEndpoint: "",
  enableCloudflareBrowserRendering: false,
  enableBrowserlessIO: false,
  chromiumBin: "",
  maxImagesToKeep: 1000,
  // API keys default to empty – presence of a non-empty value activates the key
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

/**
 * Maps environment variable names to their corresponding settings key.
 * Used by `getApiKey()` to resolve a credential from settings before env.
 */
const ENV_TO_SETTINGS_KEY: Partial<Record<string, keyof AppSettings>> = {
  WEATHER_APIKEY: "weatherApiKey",
  TODOIST_APIKEY: "todoistApiKey",
  GOOGLE_CLIENT_ID: "googleClientId",
  GOOGLE_CLIENT_SECRET: "googleClientSecret",
  GOOGLE_REFRESH_TOKEN: "googleRefreshToken",
  CLOUDFLARE_ACCOUNT_ID: "cloudflareAccountId",
  CLOUDFLARE_API_TOKEN: "cloudflareApiToken",
  BROWSERLESS_IO_TOKEN: "browserlessIoToken",
  LOGTAIL_SOURCE_TOKEN: "logtailSourceToken",
};

/**
 * Retrieve an API key or token by its environment-variable name.
 * Settings file takes precedence; falls back to the environment variable.
 */
export function getApiKey(envVarName: string): string | undefined {
  const settingsKey = ENV_TO_SETTINGS_KEY[envVarName];
  if (settingsKey) {
    const fromSettings = getSettings()[settingsKey] as string | undefined;
    if (fromSettings && fromSettings !== "") return fromSettings;
  }
  return process.env[envVarName] || undefined;
}

/**
 * Seed the initial values from environment variables when they are present.
 * This allows a smooth migration: existing .env values are picked up on the
 * first run, written to the JSON file, and can be managed via the API from
 * that point on without touching .env.
 */
function seedFromEnv(): AppSettings {
  const envRenderer = process.env.BROWSER_RENDERER as
    | AppSettings["browserRenderer"]
    | undefined;
  const browserRenderer =
    envRenderer && VALID_RENDERERS.includes(envRenderer)
      ? envRenderer
      : DEFAULTS.browserRenderer;

  const parsed = Number.parseInt(process.env.MAX_IMAGES_TO_KEEP ?? "", 10);
  const maxImagesToKeep =
    Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULTS.maxImagesToKeep;

  return {
    logLevel: process.env.LOG_LEVEL || DEFAULTS.logLevel,
    logtailEndpoint:
      process.env.LOGTAIL_ENDPOINT || DEFAULTS.logtailEndpoint,
    browserRenderer,
    browserlessEndpoint:
      process.env.BROWSERLESS_IO_ENDPOINT || DEFAULTS.browserlessEndpoint,
    enableCloudflareBrowserRendering:
      process.env.ENABLE_CLOUDFLARE_BROWSER_RENDERING === "true" ||
      DEFAULTS.enableCloudflareBrowserRendering,
    enableBrowserlessIO:
      process.env.ENABLE_BROWSERLESS_IO === "true" ||
      DEFAULTS.enableBrowserlessIO,
    chromiumBin: process.env.CHROMIUM_BIN || DEFAULTS.chromiumBin,
    maxImagesToKeep,
    // Seed API keys from env on first run; empty string means "not set in settings"
    weatherApiKey: process.env.WEATHER_APIKEY || DEFAULTS.weatherApiKey,
    todoistApiKey: process.env.TODOIST_APIKEY || DEFAULTS.todoistApiKey,
    googleClientId: process.env.GOOGLE_CLIENT_ID || DEFAULTS.googleClientId,
    googleClientSecret:
      process.env.GOOGLE_CLIENT_SECRET || DEFAULTS.googleClientSecret,
    googleRefreshToken:
      process.env.GOOGLE_REFRESH_TOKEN || DEFAULTS.googleRefreshToken,
    cloudflareAccountId:
      process.env.CLOUDFLARE_ACCOUNT_ID || DEFAULTS.cloudflareAccountId,
    cloudflareApiToken:
      process.env.CLOUDFLARE_API_TOKEN || DEFAULTS.cloudflareApiToken,
    browserlessIoToken:
      process.env.BROWSERLESS_IO_TOKEN || DEFAULTS.browserlessIoToken,
    logtailSourceToken:
      process.env.LOGTAIL_SOURCE_TOKEN || DEFAULTS.logtailSourceToken,
  };
}

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
 * Safe to call synchronously at any point; returns seeded-from-env defaults
 * before `initSettings()` has been awaited.
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
  return seedFromEnv();
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

  // First run: seed from env / defaults and persist
  const initial = seedFromEnv();
  writeToDisk(initial);
  _cache = initial;
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

// ─── Test helpers (not exported in production) ────────────────────────────────

/** @internal Reset module-level state – used in tests only. */
export function _resetForTesting(filePath?: string): void {
  _settingsFilePath = filePath ?? null;
  _cache = null;
}
