import getApp from "./app";

describe("app", () => {
  it("should 200 /health", async () => {
    const app = getApp();

    const output = await app.inject({
      method: "GET",
      path: "/health",
    });

    expect(output.statusCode).toBe(200);
  });
});
