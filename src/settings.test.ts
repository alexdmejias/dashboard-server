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
});
