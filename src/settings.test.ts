import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import {
  initSettings,
  getSettings,
  updateSettings,
  getApiKey,
  _resetForTesting,
} from "./settings";

// ─── helpers ────────────────────────────────────────────────────────────────

let tmpDir: string;
let settingsFilePath: string;

// ─── setup / teardown ───────────────────────────────────────────────────────

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "settings-test-"));
  settingsFilePath = path.join(tmpDir, "settings.json");
  // Reset in-memory state and point to an isolated temp file for each test
  _resetForTesting(settingsFilePath);
});

afterEach(async () => {
  _resetForTesting();
  delete process.env.SETTINGS_FILE;
  await fs.rm(tmpDir, { recursive: true, force: true });
});

// ─── tests ──────────────────────────────────────────────────────────────────

describe("settings", () => {
  it("creates settings.json with defaults on first run", async () => {
    const settings = await initSettings();

    // Verify file was created
    const raw = JSON.parse(await fs.readFile(settingsFilePath, "utf-8"));

    expect(settings.browserRenderer).toBe("puppeteer");
    expect(settings.maxImagesToKeep).toBe(1000);
    expect(raw.logLevel).toBe("warn");
  });

  it("seeds initial values from environment variables", async () => {
    process.env.LOG_LEVEL = "debug";
    process.env.MAX_IMAGES_TO_KEEP = "500";
    process.env.BROWSER_RENDERER = "cloudflare";

    const settings = await initSettings();

    expect(settings.logLevel).toBe("debug");
    expect(settings.maxImagesToKeep).toBe(500);
    expect(settings.browserRenderer).toBe("cloudflare");

    delete process.env.LOG_LEVEL;
    delete process.env.MAX_IMAGES_TO_KEEP;
    delete process.env.BROWSER_RENDERER;
  });

  it("does not overwrite existing settings.json on subsequent runs", async () => {
    // Write a pre-existing settings file
    await fs.writeFile(
      settingsFilePath,
      JSON.stringify({ logLevel: "error", maxImagesToKeep: 42 }),
      "utf-8",
    );

    process.env.LOG_LEVEL = "trace"; // should be ignored

    const settings = await initSettings();

    // File values win over env
    expect(settings.logLevel).toBe("error");
    expect(settings.maxImagesToKeep).toBe(42);

    delete process.env.LOG_LEVEL;
  });

  it("getSettings() returns defaults synchronously before initSettings()", () => {
    const settings = getSettings();
    expect(settings).toHaveProperty("browserRenderer");
    expect(settings).toHaveProperty("maxImagesToKeep");
  });

  it("updateSettings() persists a partial patch", async () => {
    await initSettings();
    const updated = await updateSettings({ maxImagesToKeep: 250 });

    expect(updated.maxImagesToKeep).toBe(250);

    // Verify it was written to disk
    const raw = JSON.parse(await fs.readFile(settingsFilePath, "utf-8"));
    expect(raw.maxImagesToKeep).toBe(250);
  });

  it("updateSettings() does not clobber un-patched keys", async () => {
    await initSettings();
    await updateSettings({ logLevel: "silent" });

    const settings = getSettings();
    expect(settings.logLevel).toBe("silent");
    expect(settings.browserRenderer).toBe("puppeteer"); // untouched
    expect(settings.maxImagesToKeep).toBe(1000); // untouched
  });

  // ── SETTINGS_FILE env var ──────────────────────────────────────────────────

  it("SETTINGS_FILE env var overrides the default settings path", async () => {
    const customPath = path.join(tmpDir, "custom-settings.json");
    // Point to a custom file via env var (reset module state so path is re-read)
    _resetForTesting(); // clear explicit path override first
    process.env.SETTINGS_FILE = customPath;

    const settings = await initSettings();

    // Custom file should have been created
    const raw = JSON.parse(await fs.readFile(customPath, "utf-8"));
    expect(raw.logLevel).toBe(settings.logLevel);
    expect(settings.maxImagesToKeep).toBe(1000);
  });

  // ── API key seeding from env ───────────────────────────────────────────────

  it("seeds API keys from env vars on first run", async () => {
    process.env.WEATHER_APIKEY = "weather-key-123";
    process.env.TODOIST_APIKEY = "todoist-key-456";

    const settings = await initSettings();

    expect(settings.weatherApiKey).toBe("weather-key-123");
    expect(settings.todoistApiKey).toBe("todoist-key-456");

    delete process.env.WEATHER_APIKEY;
    delete process.env.TODOIST_APIKEY;
  });

  // ── getApiKey() ────────────────────────────────────────────────────────────

  it("getApiKey() returns value from settings when set", async () => {
    await initSettings();
    await updateSettings({ weatherApiKey: "from-settings" });

    expect(getApiKey("WEATHER_APIKEY")).toBe("from-settings");
  });

  it("getApiKey() falls back to env var when not in settings", async () => {
    // Start with empty settings (no weatherApiKey)
    await fs.writeFile(settingsFilePath, JSON.stringify({ weatherApiKey: "" }), "utf-8");
    await initSettings();

    process.env.WEATHER_APIKEY = "from-env";
    expect(getApiKey("WEATHER_APIKEY")).toBe("from-env");
    delete process.env.WEATHER_APIKEY;
  });

  it("getApiKey() settings take precedence over env var", async () => {
    process.env.WEATHER_APIKEY = "from-env";
    await initSettings();
    await updateSettings({ weatherApiKey: "from-settings" });

    // settings win over env
    expect(getApiKey("WEATHER_APIKEY")).toBe("from-settings");
    delete process.env.WEATHER_APIKEY;
  });

  it("getApiKey() returns undefined when key is absent from both settings and env", async () => {
    await fs.writeFile(settingsFilePath, JSON.stringify({ weatherApiKey: "" }), "utf-8");
    await initSettings();
    delete process.env.WEATHER_APIKEY;

    expect(getApiKey("WEATHER_APIKEY")).toBeUndefined();
  });
});
