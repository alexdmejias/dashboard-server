import fastify from "fastify";
import { initSettings, _resetForTesting } from "../settings";
import adminPlugin from "./admin";
import settingsPlugin from "./settings";

const TEST_PASSWORD = "super-secret-test-pw";

async function buildApp() {
  const app = fastify({ logger: false });
  app.register(adminPlugin);
  app.register(settingsPlugin);
  await app.ready();
  return app;
}

describe("settings plugin", () => {
  beforeEach(async () => {
    process.env.ADMIN_PASSWORD = TEST_PASSWORD;
    _resetForTesting();
    await initSettings();
  });

  afterEach(async () => {
    _resetForTesting();
    delete process.env.ADMIN_PASSWORD;
  });

  // ── /api/settings (raw-password auth) ───────────────────────────────────────

  describe("GET /api/settings", () => {
    it("returns 503 when ADMIN_PASSWORD is not configured", async () => {
      delete process.env.ADMIN_PASSWORD;
      const app = await buildApp();
      const res = await app.inject({ method: "GET", url: "/api/settings" });
      expect(res.statusCode).toBe(503);
      await app.close();
    });

    it("returns 401 without Authorization header", async () => {
      const app = await buildApp();
      const res = await app.inject({ method: "GET", url: "/api/settings" });
      expect(res.statusCode).toBe(401);
      await app.close();
    });

    it("returns 401 with wrong password", async () => {
      const app = await buildApp();
      const res = await app.inject({
        method: "GET",
        url: "/api/settings",
        headers: { Authorization: "Bearer wrong-password" },
      });
      expect(res.statusCode).toBe(401);
      await app.close();
    });

    it("returns 200 with correct password", async () => {
      const app = await buildApp();
      const res = await app.inject({
        method: "GET",
        url: "/api/settings",
        headers: { Authorization: `Bearer ${TEST_PASSWORD}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveProperty("browserRenderer");
      await app.close();
    });
  });

  describe("PUT /api/settings", () => {
    it("returns 401 without auth", async () => {
      const app = await buildApp();
      const res = await app.inject({
        method: "PUT",
        url: "/api/settings",
        payload: { maxImagesToKeep: 10 },
      });
      expect(res.statusCode).toBe(401);
      await app.close();
    });

    it("returns 400 for invalid body (maxImagesToKeep < 1)", async () => {
      const app = await buildApp();
      const res = await app.inject({
        method: "PUT",
        url: "/api/settings",
        headers: {
          Authorization: `Bearer ${TEST_PASSWORD}`,
          "Content-Type": "application/json",
        },
        payload: { maxImagesToKeep: 0 },
      });
      expect(res.statusCode).toBe(400);
      await app.close();
    });

    it("returns 200 and persists valid patch", async () => {
      const app = await buildApp();
      const res = await app.inject({
        method: "PUT",
        url: "/api/settings",
        headers: {
          Authorization: `Bearer ${TEST_PASSWORD}`,
          "Content-Type": "application/json",
        },
        payload: { maxImagesToKeep: 42 },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().maxImagesToKeep).toBe(42);
      await app.close();
    });
  });

  // ── /api/admin/settings (session-token auth) ─────────────────────────────────

  async function getSessionToken(
    app: Awaited<ReturnType<typeof buildApp>>,
  ): Promise<string> {
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/login",
      payload: { password: TEST_PASSWORD },
    });
    return res.json<{ token: string }>().token;
  }

  describe("GET /api/admin/settings", () => {
    it("returns 401 without session token", async () => {
      const app = await buildApp();
      const res = await app.inject({
        method: "GET",
        url: "/api/admin/settings",
      });
      expect(res.statusCode).toBe(401);
      await app.close();
    });

    it("returns 200 with valid session token", async () => {
      const app = await buildApp();
      const token = await getSessionToken(app);
      const res = await app.inject({
        method: "GET",
        url: "/api/admin/settings",
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveProperty("browserRenderer");
      await app.close();
    });
  });

  describe("PUT /api/admin/settings", () => {
    it("returns 401 without session token", async () => {
      const app = await buildApp();
      const res = await app.inject({
        method: "PUT",
        url: "/api/admin/settings",
        payload: { maxImagesToKeep: 10 },
      });
      expect(res.statusCode).toBe(401);
      await app.close();
    });

    it("returns 400 for invalid body (browserRenderer unknown value)", async () => {
      const app = await buildApp();
      const token = await getSessionToken(app);
      const res = await app.inject({
        method: "PUT",
        url: "/api/admin/settings",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        payload: { browserRenderer: "unknown-renderer" },
      });
      expect(res.statusCode).toBe(400);
      await app.close();
    });

    it("returns 200 and persists valid patch", async () => {
      const app = await buildApp();
      const token = await getSessionToken(app);
      const res = await app.inject({
        method: "PUT",
        url: "/api/admin/settings",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        payload: { maxImagesToKeep: 99 },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().maxImagesToKeep).toBe(99);
      await app.close();
    });
  });
});
