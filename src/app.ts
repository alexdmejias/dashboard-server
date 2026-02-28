import fs from "node:fs/promises";
import path, { resolve } from "node:path";
import fastifyCors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import fastify, { type FastifyReply } from "fastify";
import type { RenderResponse } from "./base-callbacks/base";
import logger from "./logger";
import clientsPlugin from "./plugins/clients";
import type {
  PlaylistItem,
  PossibleCallbacks,
  SupportedViewType,
} from "./types";
import { getBrowserRendererType } from "./utils/getBrowserRendererType";
import { clearImagesOnStartup } from "./utils/imagesPath";
import {
  isSupportedImageViewType,
  isSupportedViewType,
} from "./utils/isSupportedViewTypes";

export const serverMessages = {
  healthGood: "ok",
  createdClient: (clientName: string) => `created new client: ${clientName}`,
  duplicateClientName: (clientName: string) =>
    `client already exists: ${clientName}`,
  clientNotFound: (clientName: string) => `client not found: ${clientName}`,
  viewTypeNotSupported: (viewType: string) =>
    `viewType not supported: ${viewType}`,
  callbackNotFound: (callback: string) => `callback not found: ${callback}`,
} as const;

async function getApp(possibleCallbacks: PossibleCallbacks = {}) {
  if (!possibleCallbacks || !Object.keys(possibleCallbacks).length) {
    throw new Error("no callbacks provided");
  }

  // Clear tmpdir on server startup
  clearImagesOnStartup();

  const app = fastify({
    loggerInstance: logger,
  });

  app.register(clientsPlugin, { possibleCallbacks });

  // Register admin plugin for authentication and client details
  const adminPlugin = await import("./plugins/admin");
  app.register(adminPlugin.default);

  app.decorateReply(
    "internalServerError",
    function (this: FastifyReply, message: string) {
      return this.code(500).send({
        error: "Internal Server Error",
        message,
        statusCode: 500,
      });
    },
  );

  app.decorateReply("notFound", function (this: FastifyReply, message: string) {
    return this.code(404).send({
      error: "Not Found",
      message,
      statusCode: 404,
    });
  });

  // TODO make this a plugin
  async function getResponseFromData(res: FastifyReply, data: RenderResponse) {
    if (isSupportedImageViewType(data.viewType) && "imagePath" in data) {
      return res
        .type(`image/${data.viewType}`)
        .send(await fs.readFile(data.imagePath));
    }

    if (data.viewType === "html") {
      return res.type("text/html").send(data.html);
    }

    if (data.viewType === "json") {
      return res.type("application/json").send(data.json);
    }

    if (data.viewType === "error") {
      return res.internalServerError(data.error);
    }

    return res.send(data);
  }

  app.register(fastifyStatic, {
    root: resolve("./public"),
    prefix: "/public/",
  });

  app.register(fastifyCors);

  app.get("/health", async (_req, res) => {
    return res.send({
      statusCode: 200,
      message: serverMessages.healthGood,
      possibleCallbacks: Object.keys(possibleCallbacks),
      clients: app.getClients(),
    });
  });

  app.post<{
    Params: {
      clientName: string;
    };
    Body: {
      playlist?: PlaylistItem[];
    };
  }>("/register/:clientName", async (req, res) => {
    const { clientName } = req.params;
    const { playlist = [] } = req.body;

    const client = app.getClient(clientName);

    // Log the request
    app.logClientRequest(
      clientName,
      "POST",
      `/register/${clientName}`,
      "incoming",
      undefined,
      undefined,
      req.id,
      req.headers as Record<string, string | string[]>,
    );

    if (!client) {
      const clientRes = await app.registerClient(clientName, playlist);

      if ("error" in clientRes) {
        app.log.error(
          { error: clientRes.error },
          `error registering client: ${clientName}`,
        );
        const msg = `Error registering client: ${clientRes.error}`;
        app.logClientActivity(clientName, "error", msg, req.id);
        app.logServerActivity("error", `[${clientName}] ${msg}`, req.id);
        return res.internalServerError(
          `Error registering client "${clientName}": ${clientRes.error}`,
        );
      }
      app.log.info(`created new client: ${clientName}`, clientRes);
      app.logClientActivity(
        clientName,
        "info",
        "Client registered successfully",
        req.id,
      );
      return {
        statusCode: 200,
        message: serverMessages.createdClient(clientName),
        client: clientRes,
      };
    }

    app.log.info(`client already exists: ${clientName}`);
    const dupMsg = serverMessages.duplicateClientName(clientName);
    app.logClientActivity(clientName, "warn", "Client already exists", req.id);
    app.logServerActivity("warn", `[${clientName}] ${dupMsg}`, req.id);
    return res.internalServerError(dupMsg);
  });

  app.get<{
    Params: {
      clientName: string;
      viewType: SupportedViewType;
      callback?: string;
    };
  }>("/display/:clientName/:viewType/:callback?", async (req, res) => {
    const startTime = Date.now();
    const { clientName, viewType, callback = "next" } = req.params;

    // Log the incoming request
    app.logClientRequest(
      clientName,
      "GET",
      `/display/${clientName}/${viewType}/${callback}`,
      "incoming",
      undefined,
      undefined,
      req.id,
      req.headers as Record<string, string | string[]>,
    );

    if (!isSupportedViewType(viewType)) {
      app.log.error(`viewType not supported: ${viewType}`);
      const msg = serverMessages.viewTypeNotSupported(viewType);
      app.logClientActivity(
        clientName,
        "error",
        `Unsupported viewType: ${viewType}`,
        req.id,
      );
      app.logServerActivity("error", `[${clientName}] ${msg}`, req.id);
      return res.internalServerError(msg);
    }

    // INFO hack to accomodate inkplate limitations with response having to have a .png extension
    const viewTypeToUse =
      (viewType as unknown) === "png.png" ? "png" : viewType;

    const client = app.getClient(clientName);
    if (!client) {
      app.log.error("client not found");
      const msg = serverMessages.clientNotFound(clientName);
      app.logClientActivity(clientName, "error", "Client not found", req.id);
      app.logServerActivity("error", `[${clientName}] ${msg}`, req.id);
      return res.notFound(msg);
    }

    app.log.info(`retrieved existing client: ${clientName}`);
    app.logClientActivity(
      clientName,
      "info",
      `Displaying ${callback} as ${viewTypeToUse}`,
      req.id,
    );

    let data: RenderResponse;
    try {
      if (callback === "next") {
        data = await client.tick(viewTypeToUse);
      } else {
        // First, check if this is a playlist item ID
        const playlistItem = client.getPlaylistItemById(callback);

        if (playlistItem) {
          // Render the complete playlist item (layout with all callbacks)
          app.log.info(`Rendering playlist item by ID: ${callback}`);
          data = await client.renderPlaylistItemById(callback, viewTypeToUse);
        } else {
          throw new Error("playlist item not found");
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      app.log.error(
        { error, clientName, viewType: viewTypeToUse },
        "Error rendering callback",
      );
      const msg = `Failed to render: ${errorMessage}`;
      app.logClientActivity(clientName, "error", msg, req.id);
      app.logServerActivity("error", `[${clientName}] ${msg}`, req.id);
      return res.internalServerError(msg);
    }

    const rendererType =
      viewTypeToUse === "html" ? undefined : getBrowserRendererType();

    app.log.info({ viewType: viewTypeToUse, rendererType }, "rendering");

    if (data.viewType === "error") {
      app.logClientActivity(clientName, "error", data.error, req.id);
      app.logServerActivity("error", `[${clientName}] ${data.error}`, req.id);
    }

    const responseTime = Date.now() - startTime;
    app.logClientRequest(
      clientName,
      "GET",
      `/display/${clientName}/${viewType}/${callback}`,
      "outgoing",
      data.viewType === "error" ? 500 : 200,
      responseTime,
      req.id,
      req.headers as Record<string, string | string[]>,
      isSupportedImageViewType(data.viewType) && "imagePath" in data
        ? path.basename(data.imagePath)
        : undefined,
    );

    return getResponseFromData(res, data);
  });

  // SSE endpoint for streaming client updates
  app.get("/api/clients/stream", async (req, res) => {
    res.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    // Send initial client state
    const clients = app.getClients();
    res.raw.write(`data: ${JSON.stringify({ clients })}\n\n`);

    // Add this connection to the set of SSE connections
    app.addSSEConnection(res);

    // Set up heartbeat
    const heartbeat = setInterval(() => {
      try {
        res.raw.write(":heartbeat\n\n");
      } catch (_err) {
        clearInterval(heartbeat);
      }
    }, 30000);

    // Clean up on connection close
    req.raw.on("close", () => {
      clearInterval(heartbeat);
      app.removeSSEConnection(res);
      app.log.info("SSE connection closed");
    });
  });

  // REST endpoint for getting current client state
  app.get("/api/clients", async (_req, res) => {
    const clients = app.getClients();
    return res.send({ clients });
  });

  // Get available callbacks
  app.get("/api/callbacks", async (_req, res) => {
    const callbacks = Object.entries(possibleCallbacks).map(([key, value]) => ({
      id: key,
      name: value.name,
      expectedConfig: value.expectedConfig,
    }));
    return res.send({ callbacks });
  });

  // Update client playlist
  app.put<{
    Params: {
      clientName: string;
    };
    Body: {
      playlist: PlaylistItem[];
    };
  }>("/api/clients/:clientName/playlist", async (req, res) => {
    const { clientName } = req.params;
    const { playlist } = req.body;

    if (!playlist || !Array.isArray(playlist)) {
      return res.code(400).send({
        error: "Bad Request",
        message: "playlist must be an array",
        statusCode: 400,
      });
    }

    const client = app.getClient(clientName);
    if (!client) {
      app.log.error(`client not found: ${clientName}`);
      const msg = serverMessages.clientNotFound(clientName);
      app.logServerActivity("error", `[${clientName}] ${msg}`, req.id);
      return res.notFound(msg);
    }

    // Log the update request
    app.logClientRequest(
      clientName,
      "PUT",
      `/api/clients/${clientName}/playlist`,
      "incoming",
      undefined,
      undefined,
      req.id,
      req.headers as Record<string, string | string[]>,
    );

    const clientRes = await app.updateClientPlaylist(clientName, playlist);

    if ("error" in clientRes) {
      app.log.error(
        { error: clientRes.error },
        `error updating playlist for client: ${clientName}`,
      );
      const msg = `Error updating playlist: ${clientRes.error}`;
      app.logClientActivity(clientName, "error", msg, req.id);
      app.logServerActivity("error", `[${clientName}] ${msg}`, req.id);
      return res.code(400).send({
        error: "Bad Request",
        message: clientRes.error,
        statusCode: 400,
      });
    }

    app.log.info(`updated playlist for client: ${clientName}`);
    app.logClientActivity(
      clientName,
      "info",
      "Playlist updated successfully",
      req.id,
    );

    return res.send({
      statusCode: 200,
      message: `Successfully updated playlist for ${clientName}`,
      client: clientRes.toString(),
    });
  });

  app.setNotFoundHandler(async (req, res) => {
    // Check if this is an API route that doesn't exist
    if (req.url.startsWith("/api/")) {
      return res.code(404).send({
        error: "Not Found",
        message: `Route ${req.url} not found`,
        statusCode: 404,
      });
    }

    // Try to serve static files from admin directory (for /assets/*)
    if (req.url.startsWith("/assets/")) {
      try {
        // Validate path to prevent directory traversal
        const requestedPath = req.url.replace("/assets/", "assets/");
        const filePath = resolve(`./public/admin/${requestedPath}`);
        const adminDir = resolve("./public/admin");

        // Ensure the resolved path is within the admin directory
        if (!filePath.startsWith(adminDir)) {
          return res.code(403).send({
            error: "Forbidden",
            message: "Access denied",
            statusCode: 403,
          });
        }

        const stat = await fs.stat(filePath);
        if (stat.isFile()) {
          return res.sendFile(
            req.url.replace("/assets/", "assets/"),
            resolve("./public/admin"),
          );
        }
      } catch (_err) {
        // File not found, continue to serve index.html
      }
    }

    // For all other routes, serve the admin index.html
    try {
      const adminIndexPath = resolve("./public/admin/index.html");
      const content = await fs.readFile(adminIndexPath, "utf-8");
      return res.type("text/html").send(content);
    } catch (err) {
      app.log.error("Error serving admin index:", err);
      return res.code(404).send({
        error: "Not Found",
        message: "Admin interface not found. Please build the admin app.",
        statusCode: 404,
      });
    }
  });

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);

    reply.send({
      statusCode: 500,
      error,
    });
  });

  return app;
}

export default getApp;
