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

