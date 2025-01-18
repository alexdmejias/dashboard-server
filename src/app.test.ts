import getApp from "./app";
import CallbackBase from "./callbacks/base";
import getScreenshot from "./utils/getScreenshot";
import fs from "node:fs/promises";

jest.mock("node:fs/promises", () => ({
  readFile: jest.fn(),
}));
jest.mock("./utils/getScreenshot");

class DummyCallback extends CallbackBase {
  constructor() {
    super({ name: "dummy" });
  }
  async getData() {
    return { text: "dummy" };
  }
}

describe("app", () => {
  it("should throw error if no callbacks provided", async () => {
    expect(() => getApp()).toThrowError("no callbacks provided");
  });

  it("should 200 /health", async () => {
    const app = getApp([DummyCallback]);

    const output = await app.inject({
      method: "GET",
      path: "/health",
    });

    expect(output.statusCode).toBe(200);
  });

  it("should 200 /", async () => {
    const app = getApp([DummyCallback]);

    (getScreenshot as jest.Mock).mockResolvedValue({
      path: "",
    });

    (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from(""));
    const output = await app.inject({
      method: "GET",
      path: "/",
    });

    expect(output.statusCode).toBe(200);
    expect(output.headers["content-type"]).toBe("image/png");
  });
});
