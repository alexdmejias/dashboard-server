import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { getRawLogLines, subscribeToNewLines } from "../logBuffer";
import { getImagesDir } from "../utils/imagesPath";

// Session tokens (for admin UI login flow)
const validTokens = new Set<string>();

declare module "fastify" {
  interface FastifyInstance {
    checkAdminAuth(req: FastifyRequest, res: FastifyReply): Promise<void>;
  }
}

function adminPlugin(fastify: FastifyInstance, _opts: any, done: () => void) {
  const adminPassword = process.env.ADMIN_PASSWORD;

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

  // Expose the session-token auth check so sibling plugins (e.g. settings)
  // can protect their own routes without duplicating the token store logic.
  fastify.decorate("checkAdminAuth", checkAuth);

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

  // Serve a previously rendered image by filename (no auth – filenames are unique)
  fastify.get<{ Params: { filename: string } }>(
    "/api/images/:filename",
    async (req, res) => {
      const { filename } = req.params;

      // Only allow simple filenames – no path separators
      if (
        filename.includes("/") ||
        filename.includes("\\") ||
        filename.includes("..")
      ) {
        return res.code(400).send({ error: "Invalid filename" });
      }

      const imagesDir = getImagesDir();
      const filePath = path.join(imagesDir, filename);

      // Ensure resolved path stays inside the images directory
      if (!filePath.startsWith(imagesDir + path.sep)) {
        return res.code(400).send({ error: "Invalid filename" });
      }

      try {
        const fileBuffer = await fs.readFile(filePath);
        const ext = path.extname(filename).slice(1).toLowerCase();
        const contentType =
          ext === "bmp"
            ? "image/bmp"
            : ext === "png"
              ? "image/png"
              : "application/octet-stream";
        return res.type(contentType).send(fileBuffer);
      } catch {
        return res.code(404).send({ error: "Image not found" });
      }
    },
  );

  // Get raw NDJSON log lines (newest-first, up to 1000 lines)
  fastify.get(
    "/api/admin/raw-logs",
    { preHandler: checkAuth },
    async (_req, res) => {
      return res.send({ lines: getRawLogLines() });
    },
  );

  // SSE stream for raw NDJSON log lines.
  // Auth via ?token= query param because EventSource cannot send custom headers.
  fastify.get<{ Querystring: { token?: string } }>(
    "/api/admin/logs/stream",
    async (req, res) => {
      const { token } = req.query;
      if (!token || !validTokens.has(token)) {
        return res.code(401).send({ error: "Unauthorized" });
      }

      res.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });

      // Send the full backlog as the first event so the client can seed the list
      res.raw.write(
        `data: ${JSON.stringify({ type: "snapshot", lines: getRawLogLines() })}\n\n`,
      );

      // Push each new line as it arrives
      const unsubscribe = subscribeToNewLines((line) => {
        try {
          res.raw.write(`data: ${JSON.stringify({ type: "line", line })}\n\n`);
        } catch {
          unsubscribe();
        }
      });

      // Heartbeat to keep the connection alive through proxies
      const heartbeat = setInterval(() => {
        try {
          res.raw.write(":heartbeat\n\n");
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      req.raw.on("close", () => {
        clearInterval(heartbeat);
        unsubscribe();
      });
    },
  );

  done();
}

export default fp(adminPlugin);
