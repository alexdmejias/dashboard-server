import CallbackBase from "./base";
import getScreenshot from "../utils/getScreenshot";
import { initSettings, updateSettings, _resetForTesting } from "../settings";

jest.mock("../utils/getScreenshot");

describe("CallbackBase", () => {
  describe("render() - browser rendering error handling", () => {
    class TestCallback extends CallbackBase {
      getData() {
        return Promise.resolve({ message: "test data" });
      }
    }

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should return error response when browser renderer fails", async () => {
      const errorMessage =
        "Cloudflare Browser Rendering failed: 401 Unauthorized - Invalid credentials";
      (getScreenshot as jest.Mock).mockRejectedValue(new Error(errorMessage));

      const callback = new TestCallback({
        name: "test-callback",
        template: "generic",
      });

      const result = await callback.render("png");

      expect(result).toEqual({
        viewType: "error",
        error: errorMessage,
      });
    });

    it("should return error response when Puppeteer renderer fails", async () => {
      const errorMessage =
        "Puppeteer is not installed. Install it with 'npm install puppeteer' or use a different renderer like 'cloudflare'.";
      (getScreenshot as jest.Mock).mockRejectedValue(new Error(errorMessage));

      const callback = new TestCallback({
        name: "test-callback",
        template: "generic",
      });

      const result = await callback.render("png");

      expect(result).toEqual({
        viewType: "error",
        error: errorMessage,
      });
    });

    it("should successfully render when browser renderer succeeds", async () => {
      (getScreenshot as jest.Mock).mockResolvedValue({
        path: "/path/to/image.png",
        buffer: Buffer.from("test"),
      });

      const callback = new TestCallback({
        name: "test-callback",
        template: "generic",
      });

      const result = await callback.render("png");

      expect(result).toEqual({
        viewType: "png",
        imagePath: expect.stringContaining("image.png"),
      });
    });

    it("should return error response for data errors", async () => {
      class ErrorCallback extends CallbackBase {
        getData() {
          return Promise.resolve({ error: "Failed to fetch data" });
        }
      }

      const callback = new ErrorCallback({
        name: "error-callback",
        template: "generic",
      });

      const result = await callback.render("png");

      expect(result).toEqual({
        viewType: "error",
        error: "Failed to fetch data",
      });
    });
  });

  // ── checkDBSettings ────────────────────────────────────────────────────────

  describe("checkDBSettings()", () => {
    beforeEach(() => {
      _resetForTesting();
    });

    afterEach(() => {
      _resetForTesting();
    });

    it("throws when a required settings key is missing", async () => {
      await initSettings();

      class SettingsCallback extends CallbackBase {
        getData() {
          return Promise.resolve({});
        }
      }

      expect(
        () =>
          new SettingsCallback({
            name: "weather",
            dbSettingsNeeded: ["weatherApiKey"],
          }),
      ).toThrow("weatherApiKey");
    });

    it("does not throw when all required settings keys are present", async () => {
      await initSettings();
      await updateSettings({ weatherApiKey: "my-api-key" });

      class SettingsCallback extends CallbackBase {
        getData() {
          return Promise.resolve({});
        }
      }

      expect(
        () =>
          new SettingsCallback({
            name: "weather",
            dbSettingsNeeded: ["weatherApiKey"],
          }),
      ).not.toThrow();
    });

    it("exposes dbSettingsNeeded on the instance", async () => {
      await initSettings();
      await updateSettings({ weatherApiKey: "key", todoistApiKey: "key2" });

      class MultiSettingsCallback extends CallbackBase {
        getData() {
          return Promise.resolve({});
        }
      }

      const cb = new MultiSettingsCallback({
        name: "weather",
        dbSettingsNeeded: ["weatherApiKey", "todoistApiKey"],
      });

      expect(cb.dbSettingsNeeded).toEqual(["weatherApiKey", "todoistApiKey"]);
    });
  });
});

