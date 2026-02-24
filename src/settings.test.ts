import {
  initSettings,
  getSettings,
  updateSettings,
  _resetForTesting,
} from "./settings";

// ─── setup / teardown ───────────────────────────────────────────────────────

beforeEach(() => {
  _resetForTesting();
  delete process.env.SETTINGS_FILE;
});

afterEach(() => {
  _resetForTesting();
  delete process.env.SETTINGS_FILE;
});

// ─── tests ──────────────────────────────────────────────────────────────────

describe("settings", () => {
  it("returns operational defaults on first init", async () => {
    const settings = await initSettings();
    expect(settings.browserRenderer).toBe("puppeteer");
    expect(settings.maxImagesToKeep).toBe(1000);
    expect(settings.logtailEndpoint).toBe("https://in.logs.betterstack.com");
    // logLevel is NOT a settings field – it lives in .env only
    expect((settings as Record<string, unknown>)).not.toHaveProperty("logLevel");
  });

  it("API key fields are absent by default", async () => {
    const settings = await initSettings();
    expect(settings.weatherApiKey).toBeUndefined();
    expect(settings.todoistApiKey).toBeUndefined();
    expect(settings.googleClientId).toBeUndefined();
    expect(settings.cloudflareAccountId).toBeUndefined();
  });

  it("getSettings() returns operational defaults synchronously before initSettings()", () => {
    const settings = getSettings();
    expect(settings).toHaveProperty("browserRenderer");
    expect(settings).toHaveProperty("maxImagesToKeep");
    expect((settings as Record<string, unknown>)).not.toHaveProperty("logLevel");
  });

  it("updateSettings() merges a partial patch", async () => {
    await initSettings();
    const updated = await updateSettings({ maxImagesToKeep: 250 });
    expect(updated.maxImagesToKeep).toBe(250);
  });

  it("updateSettings() does not clobber un-patched keys", async () => {
    await initSettings();
    await updateSettings({ maxImagesToKeep: 99 });

    const settings = getSettings();
    expect(settings.maxImagesToKeep).toBe(99);
    expect(settings.browserRenderer).toBe("puppeteer"); // untouched
    expect(settings.weatherApiKey).toBeUndefined();     // untouched
  });

  it("SETTINGS_FILE env var is accepted (path used when not in test mode)", async () => {
    process.env.SETTINGS_FILE = "/custom/path/settings.json";
    // In NODE_ENV=test lowdb uses MemorySync regardless of path –
    // this just verifies initSettings() doesn't blow up with the env var set.
    const settings = await initSettings();
    expect(settings.browserRenderer).toBe("puppeteer");
  });

  it("updateSettings() can store and retrieve an API key", async () => {
    await initSettings();
    await updateSettings({ weatherApiKey: "test-weather-key" });
    expect(getSettings().weatherApiKey).toBe("test-weather-key");
  });

  it("updateSettings() returns the merged result", async () => {
    await initSettings();
    const result = await updateSettings({
      weatherApiKey: "key",
      maxImagesToKeep: 500,
    });
    expect(result.weatherApiKey).toBe("key");
    expect(result.maxImagesToKeep).toBe(500);
    expect(result.browserRenderer).toBe("puppeteer"); // unchanged
  });
});

