import fastify, { errorCodes, FastifyError } from "fastify";
import getApp, { serverMessages } from "./app";
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

  describe("register", () => {
    it("should 200 /register/:clientName", async () => {
      const app = getApp([DummyCallback]);
      const output = await app.inject({
        method: "GET",
        path: "/register/testClient",
      });
      expect(output.statusCode).toBe(200);
      expect(output.body).toBe(serverMessages.healthGood);
    });
    it("should 500 duplicate client name", async () => {
      const app = getApp([DummyCallback]);
      const clientName = "testClient";

      await app.inject({
        method: "GET",
        path: `/register/${clientName}`,
      });

      const output = await app.inject({
        method: "GET",
        path: `/register/${clientName}`,
      });
      expect(output.statusCode).toBe(500);
      expect(output.json()).toStrictEqual({
        error: serverMessages.duplicateClientName(clientName),
      });
    });
  });

  describe("/display/:clientName/:viewType", () => {
    it("should 404 on /display", async () => {
      const app = getApp([DummyCallback]);

      const output = await app.inject({
        method: "GET",
        path: "/display",
      });

      expect(output.statusCode).toBe(404);
      const e = errorCodes.FST_ERR_NOT_FOUND();

      expect(output.json()).toMatchObject({
        error: e.message,
        statusCode: e.statusCode,
      });
    });

    it("should 500 on /display/:clientName/unknownViewType", async () => {
      const app = getApp([DummyCallback]);

      const clientName = "testClient";
      const unknownViewType = "unknownViewType";
      await app.inject({
        method: "GET",
        path: `/register/${clientName}`,
      });
      const output = await app.inject({
        method: "GET",
        path: `/display/${clientName}/${unknownViewType}`,
      });

      expect(output.statusCode).toBe(500);
      expect(output.json()).toStrictEqual({
        error: serverMessages.viewTypeNotSupported(unknownViewType),
      });
    });
  });
  // it("should 200 /", async () => {
  //   const app = getApp([DummyCallback]);

  //   (getScreenshot as jest.Mock).mockResolvedValue({
  //     path: "",
  //   });

  //   (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from(""));
  //   const output = await app.inject({
  //     method: "GET",
  //     path: "/",
  //   });

  //   expect(output.statusCode).toBe(200);
  //   expect(output.headers["content-type"]).toBe("image/png");
  // });
});
