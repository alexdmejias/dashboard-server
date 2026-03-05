import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { getRawLogLines, subscribeToNewLines } from "../logBuffer";
import {
  type AppSettings,
  getSettings,
  updateSettings,
  VALID_RENDERERS,
} from "../settings";
import { getImagesDir } from "../utils/imagesPath";

// Session tokens (for admin UI login flow)
const validTokens = new Set<string>();

declare module "fastify" {
  interface FastifyInstance {}
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

  // ── Auth middleware for /api/settings routes ───────────────────────────────
  // Settings endpoints require the Authorization header to carry the raw
  // ADMIN_PASSWORD value directly (API-key style, separate from UI sessions).
  const checkSettingsAuth = async (req: FastifyRequest, res: FastifyReply) => {
    if (!adminPassword) {
      return res.code(503).send({
        error: "Settings endpoint requires ADMIN_PASSWORD to be configured.",
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

  done();
}

export default fp(adminPlugin);
