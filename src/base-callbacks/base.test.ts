import { _resetForTesting, initSettings, updateSettings } from "../settings";
import { renderLiquidFile } from "../utils/getRenderedTemplate";
import CallbackBase from "./base";

jest.mock("../utils/getRenderedTemplate", () => ({
  renderLiquidFile: jest.fn().mockResolvedValue("<div>rendered</div>"),
}));

/**
 * TestCallback uses the "weather" name so its template resolves to the
 * existing src/callbacks/weather/template.liquid file.
 */
class TestCallback extends CallbackBase {
  getData() {
    return Promise.resolve({ message: "test data" });
  }
}

describe("CallbackBase", () => {
  describe("render()", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should return JSON response for json viewType", async () => {
      const callback = new TestCallback({ name: "weather" });
      const result = await callback.render("json");

      expect(result).toEqual({
        viewType: "json",
        json: { message: "test data" },
      });
    });

    it("should return HTML response for html viewType", async () => {
      const callback = new TestCallback({ name: "weather" });
      const result = await callback.render("html");

      expect(result).toEqual({
        viewType: "html",
        html: "<div>rendered</div>",
      });
      expect(renderLiquidFile).toHaveBeenCalled();
    });

    it("should return error response when getData returns an error", async () => {
      class ErrorCallback extends CallbackBase {
        getData() {
          return Promise.resolve({ error: "Failed to fetch data" });
        }
      }

      const callback = new ErrorCallback({ name: "weather" });
      const result = await callback.render("json");

      expect(result).toEqual({
        viewType: "error",
        error: "Failed to fetch data",
      });
    });

    it("should return JSON for image viewTypes (image rendering is handled at StateMachine level)", async () => {
      const callback = new TestCallback({ name: "weather" });
      const result = await callback.render("png");

      expect(result).toEqual({
        viewType: "json",
        json: { message: "test data" },
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
