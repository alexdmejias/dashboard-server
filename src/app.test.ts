import getApp, { serverMessages } from "./app";
import CallbackBase from "./base-callbacks/base";

jest.mock("node:fs/promises", () => ({
  readFile: jest.fn(),
  stat: jest.fn(),
}));
jest.mock("./utils/getRenderedTemplate", () => ({
  renderLiquidFile: jest.fn().mockResolvedValue("<div>rendered</div>"),
}));

/**
 * DummyCallback uses the "weather" name so its template resolves to the
 * existing src/callbacks/weather/template.liquid file.
 */
class DummyCallback extends CallbackBase {
  constructor(_options?: unknown) {
    super({ name: "weather" });
  }

  async getData() {
    return { text: "dummy" };
  }
}

const POSSIBLE_CALLBACKS = {
  weather: { name: "weather", callback: DummyCallback },
};

const VALID_PLAYLIST = [
  {
    id: "item1",
    layout: "full" as const,
    callbacks: {
      content: { name: "weather" },
    },
  },
];

function expectInternalError(output: any, message: string) {
  expect(output.statusCode).toBe(500);
  expect(output.json()).toStrictEqual({
    error: "Internal Server Error",
    message,
    statusCode: 500,
  });
}

describe("app", () => {
  it("should 200 /health", async () => {
    const app = await getApp(POSSIBLE_CALLBACKS);

    const output = await app.inject({
      method: "GET",
      path: "/health",
    });

    expect(output.statusCode).toBe(200);
    expect(output.json()).toMatchObject({
      message: serverMessages.healthGood,
      statusCode: 200,
    });
  });

  describe("register", () => {
    it("should 200 POST /register/:clientName", async () => {
      const app = await getApp(POSSIBLE_CALLBACKS);
      const clientName = "testClient";

      const output = await app.inject({
        method: "POST",
        path: `/register/${clientName}`,
        payload: { playlist: VALID_PLAYLIST },
      });

      expect(output.statusCode).toBe(200);
      expect(output.json()).toMatchObject({
        statusCode: 200,
        message: serverMessages.createdClient(clientName),
      });
    });

    it("should 500 on duplicate client name", async () => {
      const app = await getApp(POSSIBLE_CALLBACKS);
      const clientName = "testClient";

      await app.inject({
        method: "POST",
        path: `/register/${clientName}`,
        payload: { playlist: VALID_PLAYLIST },
      });

      const output = await app.inject({
        method: "POST",
        path: `/register/${clientName}`,
        payload: { playlist: VALID_PLAYLIST },
      });

      expectInternalError(
        output,
        serverMessages.duplicateClientName(clientName),
      );
    });
  });

  describe("/display/:clientName/:viewType", () => {
    it("should 404 on /api/unknown-route", async () => {
      const app = await getApp(POSSIBLE_CALLBACKS);

      const output = await app.inject({
        method: "GET",
        path: "/api/unknown-route",
      });

      expect(output.statusCode).toBe(404);
    });

    it("should 404 on /display/notRegistered/png", async () => {
      const app = await getApp(POSSIBLE_CALLBACKS);

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
      const app = await getApp(POSSIBLE_CALLBACKS);
      const clientName = "testClient";
      const unknownViewType = "unknownViewType";

      await app.inject({
        method: "POST",
        path: `/register/${clientName}`,
        payload: { playlist: VALID_PLAYLIST },
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

    it("should 200 with HTML on /display/:clientName/html", async () => {
      const app = await getApp(POSSIBLE_CALLBACKS);
      const clientName = "testClient";

      await app.inject({
        method: "POST",
        path: `/register/${clientName}`,
        payload: { playlist: VALID_PLAYLIST },
      });

      const output = await app.inject({
        method: "GET",
        path: `/display/${clientName}/html`,
      });

      expect(output.statusCode).toBe(200);
      expect(output.headers["content-type"]).toMatch(/text\/html/);
    });
  });
});
