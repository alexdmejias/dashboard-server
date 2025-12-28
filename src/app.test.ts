import fastify, { errorCodes, FastifyError } from "fastify";
import getApp, { serverMessages } from "./app";
import CallbackBase from "./base-callbacks/base";
import getRenderedTemplate from "./utils/getRenderedTemplate";

jest.mock("node:fs/promises", () => ({
  readFile: jest.fn(),
}));
jest.mock("./utils/getScreenshot");
jest.mock("./utils/getRenderedTemplate");

class DummyCallback extends CallbackBase {
  constructor() {
    super({ name: "dummy" });
  }
  async getData() {
    return { text: "dummy" };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function testServerInternalError(output: any, message: string) {
  expect(output.statusCode).toBe(500);
  expect(output.json()).toStrictEqual({
    error: "Internal Server Error",
    message,
    statusCode: 500,
  });
}

describe("app", () => {
  // it("should throw error if no callbacks provided", async () => {
  //   expect(async () => await getApp()).toThrowError("no callbacks provided");
  // });

  it("should 200 /health", async () => {
    const app = await getApp([DummyCallback]);

    const output = await app.inject({
      method: "GET",
      path: "/health",
    });

    expect(output.statusCode).toBe(200);
    expect(output.json()).toStrictEqual({
      message: serverMessages.healthGood,
      statusCode: 200,
    });
  });

  describe("register", () => {
    it("should 200 /register/:clientName", async () => {
      const app = await getApp([DummyCallback]);
      const clientName = "testClient";
      const output = await app.inject({
        method: "GET",
        path: `/register/${clientName}`,
      });
      expect(output.statusCode).toBe(200);
      expect(output.json()).toStrictEqual({
        statusCode: 200,
        message: serverMessages.createdClient(clientName),
      });
    });

    it("should 500 duplicate client name", async () => {
      const app = await getApp([DummyCallback]);
      const clientName = "testClient";

      await app.inject({
        method: "GET",
        path: `/register/${clientName}`,
      });

      const output = await app.inject({
        method: "GET",
        path: `/register/${clientName}`,
      });
      testServerInternalError(
        output,
        serverMessages.duplicateClientName(clientName),
      );
    });
  });

  describe("/display/:clientName/:viewType", () => {
    it("should 404 on /display", async () => {
      const app = await getApp([DummyCallback]);

      const output = await app.inject({
        method: "GET",
        path: "/display",
      });

      const e = errorCodes.FST_ERR_NOT_FOUND();

      expect(output.statusCode).toBe(404);
      expect(output.json()).toMatchObject({
        error: e.message,
        statusCode: e.statusCode,
      });
    });

    it("should 404 on /display/notRegistered/png", async () => {
      const app = await getApp([DummyCallback]);

      const clientName = "notRegistered";
      const output = await app.inject({
        method: "GET",
        path: `/display/${clientName}/png`,
      });

      expect(output.statusCode).toBe(404);
      expect(output.json()).toStrictEqual({
        error: "Not Found",
        statusCode: 404,
        message: serverMessages.clientNotFound(clientName),
      });
    });

    it("should 500 on /display/:clientName/unknownViewType", async () => {
      const app = await getApp([DummyCallback]);

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
        error: "Internal Server Error",
        message: serverMessages.viewTypeNotSupported(unknownViewType),
        statusCode: 500,
      });
    });

    it("should 404 on /display/:clientName/:viewType/", async () => {
      const app = await getApp([DummyCallback]);

      const clientName = "testClient";
      const viewType = "html";
      const mockedHtml = "dummy page";
      (getRenderedTemplate as jest.Mock).mockReturnValue(mockedHtml);

      await app.inject({
        method: "GET",
        path: `/register/${clientName}`,
      });
      const output = await app.inject({
        method: "GET",
        path: `/display/${clientName}/${viewType}/dummy`,
      });

      expect(output.statusCode).toBe(200);
      expect(output.headers["content-type"]).toBe("text/html");
      expect(output.body).toStrictEqual(mockedHtml);
    });
  });
});
