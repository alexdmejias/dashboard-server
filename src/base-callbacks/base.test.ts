import CallbackBase from "./base";
import getScreenshot from "../utils/getScreenshot";

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
});
