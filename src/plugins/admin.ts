import crypto from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import {
  type AppSettings,
  VALID_RENDERERS,
  getSettings,
  updateSettings,
} from "../settings";

// Store for client-specific logs and requests
const clientLogs: Map<string, Array<any>> = new Map();
const clientRequests: Map<string, Array<any>> = new Map();

// Store for server-wide logs
const serverLogs: Array<any> = [];

// Session tokens (for admin UI login flow)
const validTokens = new Set<string>();

declare module "fastify" {
  interface FastifyInstance {
    logClientActivity(
      clientName: string,
      level: string,
      message: string,
      reqId?: string,
    ): void;
    logClientRequest(
      clientName: string,
      method: string,
      url: string,
      direction: "incoming" | "outgoing",
      statusCode?: number,
      responseTime?: number,
      reqId?: string,
      headers?: Record<string, string | string[]>,
    ): void;
  }
}

function adminPlugin(fastify: FastifyInstance, _opts: any, done: () => void) {
  const adminPassword = process.env.ADMIN_PASSWORD;

  // Hook into Fastify logs through onResponse hook
  fastify.addHook("onResponse", async (request, reply) => {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level:
          reply.statusCode >= 500
            ? "error"
            : reply.statusCode >= 400
              ? "warn"
              : "info",
        message: `${request.method} ${request.url} - ${reply.statusCode}`,
        reqId: request.id,
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
      };

      serverLogs.push(logEntry);
      // Keep only last 500 logs
      if (serverLogs.length > 500) {
        serverLogs.shift();
      }
    } catch (_e) {
      // Silently fail to avoid breaking the app
    }
  });

  // Add methods to log client activity
  fastify.decorate(
    "logClientActivity",
    (clientName: string, level: string, message: string, reqId?: string) => {
      if (!clientLogs.has(clientName)) {
        clientLogs.set(clientName, []);
      }
      const logs = clientLogs.get(clientName)!;
      logs.push({
        timestamp: new Date().toISOString(),
        level,
        message,
        reqId,
      });
      // Keep only last 100 logs per client
      if (logs.length > 100) {
        logs.shift();
      }
    },
  );

  fastify.decorate(
    "logClientRequest",
    (
      clientName: string,
      method: string,
      url: string,
      direction: "incoming" | "outgoing",
      statusCode?: number,
      responseTime?: number,
      reqId?: string,
      headers?: Record<string, string | string[]>,
    ) => {
      if (!clientRequests.has(clientName)) {
        clientRequests.set(clientName, []);
      }
      const requests = clientRequests.get(clientName)!;
      requests.push({
        timestamp: new Date().toISOString(),
        method,
        url,
        direction,
        statusCode,
        responseTime,
        reqId,
        headers,
      });
      // Keep only last 50 requests per client
      if (requests.length > 50) {
        requests.shift();
      }
    },
  );

  // Auth is always required for the admin UI
  fastify.get("/api/admin/auth-required", async (_req, res) => {
    return res.send({ required: true });
  });

  // Login endpoint – requires ADMIN_PASSWORD to be configured
  fastify.post<{ Body: { password: string } }>(
    "/api/admin/login",
    async (req, res) => {
      if (!adminPassword) {
        return res.code(503).send({
          error:
            "Admin authentication is not configured. Set the ADMIN_PASSWORD environment variable.",
        });
      }

      const { password } = req.body;
      if (password === adminPassword) {
        const token = crypto.randomBytes(32).toString("hex");
        validTokens.add(token);
        return res.send({ token });
      }

      return res.code(401).send({ error: "Invalid password" });
    },
  );

  // Verify session token
  fastify.get("/api/admin/verify", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.code(401).send({ valid: false });
    }

    const token = authHeader.substring(7);
    if (validTokens.has(token)) {
      return res.send({ valid: true });
    }

    return res.code(401).send({ valid: false });
  });

  // ── Auth middleware for admin UI session-token routes ──────────────────────
  // Admin UI always requires a valid session token obtained via /api/admin/login.
  const checkAuth = async (req: FastifyRequest, res: FastifyReply) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.code(401).send({ error: "Unauthorized" });
    }

    const token = authHeader.substring(7);
    if (!validTokens.has(token)) {
      return res.code(401).send({ error: "Invalid token" });
    }
  };

  // ── Auth middleware for /api/settings routes ───────────────────────────────
  // Settings endpoints require the Authorization header to carry the raw
  // ADMIN_PASSWORD value directly (API-key style, separate from UI sessions).
  const checkSettingsAuth = async (req: FastifyRequest, res: FastifyReply) => {
    if (!adminPassword) {
      return res.code(503).send({
        error:
          "Settings endpoint requires ADMIN_PASSWORD to be configured.",
      });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.code(401).send({ error: "Unauthorized" });
    }

    const provided = authHeader.substring(7);

    // Timing-safe comparison to prevent timing attacks
    const providedBuf = Buffer.from(provided);
    const expectedBuf = Buffer.from(adminPassword);
    const matches =
      providedBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(providedBuf, expectedBuf);

    if (!matches) {
      return res.code(401).send({ error: "Invalid credentials" });
    }
  };

  // Get specific client details
  fastify.get<{ Params: { clientName: string } }>(
    "/api/clients/:clientName",
    { preHandler: checkAuth },
    async (req, res) => {
      const { clientName } = req.params;
      const client = fastify.getClient(clientName);

      if (!client) {
        return res.code(404).send({ error: "Client not found" });
      }

      return res.send(client.toString());
    },
  );

  // Get client logs
  fastify.get<{ Params: { clientName: string } }>(
    "/api/clients/:clientName/logs",
    { preHandler: checkAuth },
    async (req, res) => {
      const { clientName } = req.params;
      const logs = clientLogs.get(clientName) || [];
      return res.send({ logs });
    },
  );

  // Get client requests
  fastify.get<{ Params: { clientName: string } }>(
    "/api/clients/:clientName/requests",
    { preHandler: checkAuth },
    async (req, res) => {
      const { clientName } = req.params;
      const requests = clientRequests.get(clientName) || [];
      return res.send({ requests });
    },
  );

  // Get server logs
  fastify.get(
    "/api/admin/logs",
    { preHandler: checkAuth },
    async (_req, res) => {
      return res.send({ logs: serverLogs });
    },
  );

  // Get current settings – requires raw ADMIN_PASSWORD in Authorization header
  fastify.get(
    "/api/settings",
    { preHandler: checkSettingsAuth },
    async (_req, res) => {
      return res.send(getSettings());
    },
  );

  // Update settings – requires raw ADMIN_PASSWORD in Authorization header
  fastify.put<{ Body: Partial<AppSettings> }>(
    "/api/settings",
    { preHandler: checkSettingsAuth },
    async (req, res) => {
      const patch = req.body;
      const errors: string[] = [];

      if (
        patch.browserRenderer !== undefined &&
        !VALID_RENDERERS.includes(patch.browserRenderer)
      ) {
        errors.push(
          `browserRenderer must be one of: ${VALID_RENDERERS.join(", ")}`,
        );
      }

      if (patch.maxImagesToKeep !== undefined) {
        const n = Number(patch.maxImagesToKeep);
        if (!Number.isFinite(n) || n < 1) {
          errors.push("maxImagesToKeep must be a positive integer");
        }
      }

      if (errors.length > 0) {
        return res.code(400).send({ error: errors.join("; ") });
      }

      try {
        const updated = await updateSettings(patch);
        return res.send(updated);
      } catch (err) {
        fastify.log.error({ err }, "Failed to update settings");
        return res.code(500).send({ error: "Failed to update settings" });
      }
    },
  );

  // Get current settings – requires valid admin session token
  fastify.get(
    "/api/admin/settings",
    { preHandler: checkAuth },
    async (_req, res) => {
      return res.send(getSettings());
    },
  );

  // Update settings – requires valid admin session token
  fastify.put<{ Body: Partial<AppSettings> }>(
    "/api/admin/settings",
    { preHandler: checkAuth },
    async (req, res) => {
      const patch = req.body;
      const errors: string[] = [];

      if (
        patch.browserRenderer !== undefined &&
        !VALID_RENDERERS.includes(patch.browserRenderer)
      ) {
        errors.push(
          `browserRenderer must be one of: ${VALID_RENDERERS.join(", ")}`,
        );
      }

      if (patch.maxImagesToKeep !== undefined) {
        const n = Number(patch.maxImagesToKeep);
        if (!Number.isFinite(n) || n < 1) {
          errors.push("maxImagesToKeep must be a positive integer");
        }
      }

      if (errors.length > 0) {
        return res.code(400).send({ errors });
      }

      try {
        const updated = await updateSettings(patch);
        return res.send(updated);
      } catch (err) {
        fastify.log.error({ err }, "Failed to update settings");
        return res.code(500).send({ error: "Failed to update settings" });
      }
    },
  );

  done();
}

export default fp(adminPlugin);
