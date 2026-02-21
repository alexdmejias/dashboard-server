import fs from "node:fs";
import path from "node:path";
import { PROJECT_ROOT } from "./utils/projectRoot";

/**
 * Non-sensitive operational settings that can be changed at runtime.
 *
 * Sensitive values (API keys, OAuth credentials, passwords) intentionally
 * remain in the .env file and are NOT stored here.
 */
export type AppSettings = {
  /** Pino log level (trace | debug | info | warn | error | fatal | silent) */
  logLevel: string;
  /** Optional custom Logtail / Better Stack ingest endpoint */
  logtailEndpoint: string;
  /** Which browser renderer to use for screenshot generation */
  browserRenderer: "puppeteer" | "cloudflare" | "browserless" | "multi";
  /** Browserless.io endpoint URL (the token stays in .env) */
  browserlessEndpoint: string;
  /** Enable Cloudflare browser rendering in multi-renderer mode */
  enableCloudflareBrowserRendering: boolean;
  /** Enable Browserless.io in multi-renderer mode */
  enableBrowserlessIO: boolean;
  /** Path to a custom Chromium binary (puppeteer renderer only) */
  chromiumBin: string;
  /** Maximum number of generated images to keep in the temp directory */
  maxImagesToKeep: number;
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
};

const VALID_RENDERERS: AppSettings["browserRenderer"][] = [
  "puppeteer",
  "cloudflare",
  "browserless",
  "multi",
];

export { VALID_RENDERERS };

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
  };
}

// ─── Internal state ──────────────────────────────────────────────────────────

let _settingsFilePath: string | null = null;
let _cache: AppSettings | null = null;

function getSettingsFilePath(): string {
  if (!_settingsFilePath) {
    _settingsFilePath = path.join(PROJECT_ROOT, "settings.json");
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
