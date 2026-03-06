import crypto from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { type AppSettings, getSettings, updateSettings } from "../settings";
import { settingsZodSchema } from "./settingsSchema";

function settingsPlugin(
  fastify: FastifyInstance,
  _opts: any,
  done: () => void,
) {
  const adminPassword = process.env.ADMIN_PASSWORD;

  // ── Auth middleware for /api/settings routes ───────────────────────────────
  // These endpoints require the raw ADMIN_PASSWORD in the Authorization header
  // (API-key style, separate from the admin UI session-token flow).
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

  // Shared handler: validate body with zod schema then persist the patch.
  async function handleSettingsUpdate(
    req: FastifyRequest<{ Body: Partial<AppSettings> }>,
    res: FastifyReply,
  ) {
    const result = settingsZodSchema.safeParse(req.body);
    if (!result.success) {
      return res.code(400).send({
        error: result.error.issues.map((i) => i.message).join("; "),
      });
    }

    try {
      const updated = await updateSettings(result.data);
      return res.send(updated);
    } catch (err) {
      fastify.log.error({ err }, "Failed to update settings");
      return res.code(500).send({ error: "Failed to update settings" });
    }
  }

  // Get settings via admin UI session token
  fastify.get(
    "/api/admin/settings",
    { preHandler: fastify.checkAdminAuth },
    async (_req, res) => {
      return res.send(getSettings());
    },
  );

  // Update settings via admin UI session token
  fastify.put<{ Body: Partial<AppSettings> }>(
    "/api/admin/settings",
    { preHandler: fastify.checkAdminAuth },
    handleSettingsUpdate,
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
    handleSettingsUpdate,
  );

  done();
}

export default fp(settingsPlugin);
