import crypto from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

// Store for client-specific logs and requests
const clientLogs: Map<string, Array<any>> = new Map();
const clientRequests: Map<string, Array<any>> = new Map();

// Store for server-wide logs
const serverLogs: Array<any> = [];

// Session tokens
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
  const authRequired = Boolean(adminPassword);

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

  // Check if auth is required
  fastify.get("/api/admin/auth-required", async (_req, res) => {
    return res.send({ required: authRequired });
  });

  // Login endpoint
  fastify.post<{ Body: { password: string } }>(
    "/api/admin/login",
    async (req, res) => {
      if (!authRequired) {
        return res.code(400).send({ error: "Authentication not required" });
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

  // Verify token
  fastify.get("/api/admin/verify", async (req, res) => {
    if (!authRequired) {
      return res.send({ valid: true });
    }

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

  // Middleware to check authentication for protected routes
  const checkAuth = async (req: FastifyRequest, res: FastifyReply) => {
    if (!authRequired) {
      return; // No auth required
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.code(401).send({ error: "Unauthorized" });
    }

    const token = authHeader.substring(7);
    if (!validTokens.has(token)) {
      return res.code(401).send({ error: "Invalid token" });
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

  done();
}

export default fp(adminPlugin);
