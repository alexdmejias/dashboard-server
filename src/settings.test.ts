import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import {
  initSettings,
  getSettings,
  updateSettings,
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
    expect(raw.browserRenderer).toBe("puppeteer");
    // logLevel is NOT in settings – it lives in .env only
    expect(raw).not.toHaveProperty("logLevel");
  });

  it("reads an existing settings.json without overwriting it", async () => {
    // Write a pre-existing settings file
    await fs.writeFile(
      settingsFilePath,
      JSON.stringify({ maxImagesToKeep: 42 }),
      "utf-8",
    );

    const settings = await initSettings();

    // File values win
    expect(settings.maxImagesToKeep).toBe(42);
  });

  it("getSettings() returns defaults synchronously before initSettings()", () => {
    const settings = getSettings();
    expect(settings).toHaveProperty("browserRenderer");
    expect(settings).toHaveProperty("maxImagesToKeep");
    expect(settings).not.toHaveProperty("logLevel");
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
    await updateSettings({ maxImagesToKeep: 99 });

    const settings = getSettings();
    expect(settings.maxImagesToKeep).toBe(99);
    expect(settings.browserRenderer).toBe("puppeteer"); // untouched
    expect(settings.weatherApiKey).toBe("");             // untouched
  });

  // ── SETTINGS_FILE env var ──────────────────────────────────────────────────

  it("SETTINGS_FILE env var overrides the default settings path", async () => {
    const customPath = path.join(tmpDir, "custom-settings.json");
    _resetForTesting(); // clear explicit path override so env var is picked up
    process.env.SETTINGS_FILE = customPath;

    const settings = await initSettings();

    // Custom file should have been created
    const raw = JSON.parse(await fs.readFile(customPath, "utf-8"));
    expect(raw.browserRenderer).toBe(settings.browserRenderer);
    expect(settings.maxImagesToKeep).toBe(1000);
  });

  // ── API key fields ─────────────────────────────────────────────────────────

  it("API key fields default to empty string", async () => {
    const settings = await initSettings();

    expect(settings.weatherApiKey).toBe("");
    expect(settings.todoistApiKey).toBe("");
    expect(settings.googleClientId).toBe("");
    expect(settings.cloudflareAccountId).toBe("");
  });

  it("updateSettings() can store and retrieve an API key", async () => {
    await initSettings();
    await updateSettings({ weatherApiKey: "test-weather-key" });

    const settings = getSettings();
    expect(settings.weatherApiKey).toBe("test-weather-key");

    const raw = JSON.parse(await fs.readFile(settingsFilePath, "utf-8"));
    expect(raw.weatherApiKey).toBe("test-weather-key");
  });
});

