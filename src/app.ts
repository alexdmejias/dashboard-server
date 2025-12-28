// import * as Sentry from "@sentry/node";
import * as dotenv from "dotenv";
import "./instrument";
dotenv.config();

import fs from "node:fs/promises";
import os from "node:os";
import { resolve } from "node:path";
import fastifyCors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import fastifyView from "@fastify/view";
import fastify, { type FastifyReply } from "fastify";
import type { RenderResponse } from "./base-callbacks/base";
import logger from "./logger";
import clientsPlugin from "./plugins/clients";
import type { PossibleCallbacks, SupportedViewType } from "./types";
import getRenderedTemplate from "./utils/getRenderedTemplate";
import getScreenshot from "./utils/getScreenshot";
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

  const app = fastify({
    loggerInstance: logger,
  });

  if (process.env.SENTRY_DSN && process.env.NODE_ENV === "production") {
    // Sentry.setupFastifyErrorHandler(app);
  }

  // const messageHandler = new CallbackMessage();

  app.register(clientsPlugin, { possibleCallbacks });

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

  app.register(fastifyView, {
    engine: {
      ejs: import("ejs"),
    },
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
      playlist?: {
        id: string;
        callbackName: string;
        options?: Record<string, unknown>;
      }[];
    };
  }>("/register/:clientName", async (req, res) => {
    const { clientName } = req.params;
    const { playlist = [] } = req.body;

    const client = app.getClient(clientName);

    if (!client) {
      const clientRes = await app.registerClient(clientName, playlist);

      if ("error" in clientRes) {
        app.log.error(
          { error: clientRes.error },
          `error registering client: ${clientName}`,
        );
        return res.internalServerError(
          `Error registering client "${clientName}": ${clientRes.error}`,
        );
      }
      app.log.info(`created new client: ${clientName}`, clientRes);
      return {
        statusCode: 200,
        message: serverMessages.createdClient(clientName),
        client: clientRes,
      };
    }

    app.log.info(`client already exists: ${clientName}`);
    return res.internalServerError(
      serverMessages.duplicateClientName(clientName),
    );
  });

  app.get<{
    Params: {
      clientName: string;
      viewType: SupportedViewType;
      callback?: string;
    };
  }>("/display/:clientName/:viewType/:callback?", async (req, res) => {
    const { clientName, viewType, callback = "next" } = req.params;

    if (!isSupportedViewType(viewType)) {
      app.log.error(`viewType not supported: ${viewType}`);
      return res.internalServerError(
        serverMessages.viewTypeNotSupported(viewType),
      );
    }

    // INFO hack to accomodate inkplate limitations with response having to have a .png extension
    const viewTypeToUse =
      (viewType as unknown) === "png.png" ? "png" : viewType;

    const client = app.getClient(clientName);
    if (!client) {
      app.log.error("client not found");
      return res.notFound(serverMessages.clientNotFound(clientName));
    }

    app.log.info(`retrieved existing client: ${clientName}`);

    let data: RenderResponse;
    if (callback === "next") {
      data = await client.tick(viewTypeToUse);
    } else {
      const callbackInstance = client.getCallbackInstance(callback);
      const playlistItem = client.getPlaylistItemById(callback);
      if (!callbackInstance || !playlistItem) {
        app.log.error(`callback not found: ${callback}`);
        return res.notFound(serverMessages.callbackNotFound(callback));
      }

      // render may accept runtime options; use a typed cast to avoid `any`
      type RenderWithOptions = (
        viewType: SupportedViewType,
        options?: Record<string, unknown>,
      ) => Promise<RenderResponse>;

      data = await (
        callbackInstance as unknown as {
          render: RenderWithOptions;
        }
      ).render(
        viewTypeToUse,
        playlistItem.options as Record<string, unknown> | undefined,
      );
    }

    app.log.info(
      {
        clientName,
        viewTypeToUse,
      },
      "sending response",
    );
    return getResponseFromData(res, data);
  });

  app.post<{
    Body: {
      templateType: "liquid" | "ejs";
      template: string;
      templateData?: Record<string, unknown>;
      screenDetails: {
        width: number;
        height: number;
        bits?: number;
        output: "html" | "png" | "bmp";
      };
    };
  }>("/test-template", async (req, res) => {
    const {
      templateType,
      template,
      templateData = {},
      screenDetails,
    } = req.body;

    if (!templateType || !template || !screenDetails) {
      return res.code(400).send({ error: "invalid request body" });
    }

    try {
      const ext = templateType === "liquid" ? "liquid" : "ejs";

      // write the provided template body to a temporary template file.
      // We write only the body; getRenderedTemplate will compose head/footer
      // when given a template path.
      const tmpName = `dashboard-template-${Date.now()}-${Math.floor(
        Math.random() * 1e9,
      )}.${ext}`;
      const tmpPath = resolve(os.tmpdir(), tmpName);
      await fs.writeFile(tmpPath, template, "utf-8");

      try {
        if (screenDetails.output === "html") {
          const renderedHtml = await getRenderedTemplate({
            template: tmpPath,
            data: templateData,
            runtimeConfig: screenDetails,
          });

          return res.type("text/html").send(renderedHtml);
        }

        // image output (png or bmp) — use shared getScreenshot utility
        const extOut = screenDetails.output === "bmp" ? "bmp" : "png";
        const fileName = `test-template-${Date.now()}.${extOut}`;
        const imagePath = resolve(`./public/images/${fileName}`);

        const width = screenDetails.width ?? 1200;
        const height = screenDetails.height ?? 825;

        const { buffer } = await getScreenshot({
          template: tmpPath,
          data: templateData,
          runtimeConfig: screenDetails,
          imagePath,
          viewType: extOut,
          size: { width, height },
        });

        const contentType = extOut === "bmp" ? "image/bmp" : "image/png";
        return res.type(contentType).send(buffer);
      } finally {
        // best-effort cleanup of the temp template
        try {
          await fs.unlink(tmpPath);
        } catch (e) {
          app.log.debug({ err: e }, "failed to remove temp template file");
        }
      }
    } catch (err) {
      app.log.error(err);
      return res.internalServerError("Error rendering template");
    }
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

  // type TestParams = {
  //   name: string;
  //   viewType: SupportedViewTypes;
  // };

  // app.get<{
  //   Params: TestParams;
  //   Querystring: Record<string, string | undefined>;
  // }>("/test/:name/:viewType?", async (req, res) => {
  //   const { name, viewType = "json" } = req.params;
  //   const { message = "" } = req.query;

  //   let callback: CallbackBase | undefined;

  //   if (app.stateMachine.hasCallback(name)) {
  //     callback = app.stateMachine.getCallbackInstance(name);
  //   } else if (name === "message") {
  //     messageHandler.setMessage(
  //       message ||
  //         "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Interdum posuere lorem ipsum dolor. Mauris pellentesque pulvinar pellentesque habitant morbi tristique senectus et."
  //     );

  //     callback = messageHandler;
  //   }

  //   if (!callback) {
  //     const errorMessage = `"${name}" callback has not been added to the test route, available callbacks are ${Object.keys(
  //       app.stateMachine.callbacks
  //     )}`;

  //     const output = await app.stateMachine.renderError(errorMessage, viewType);
  //     if (viewType === "html") {
  //       return fs.readFile(output as string);
  //     } else if (viewType === "png") {
  //       return res.type("image/png").send(await fs.readFile(output as string));
  //     } else {
  //       return res.send(errorMessage);
  //     }
  //   }

  //   const renderResult = await callback.render(viewType);

  //   if (viewType === "png" && typeof renderResult === "string") {
  //     return res.type("image/png").send(await fs.readFile(renderResult));
  //   } else if (viewType === "html") {
  //     return res.type("text/html").send(renderResult);
  //   } else {
  //     return res.send(renderResult);
  //   }
  // });

  // app.get("/api/clients", (req, res) => {
  //   res.send({
  //     data: {
  //       clients: Object.keys(app.clients),
  //     },
  //   });
  // });

  // // app.post<{ Body: Config["rotation"] }>("/set-rotation", (req, res) => {
  // //   try {
  // //     app.stateMachine.setRotation(req.body);

  // //     return res.send({
  // //       status: "ok",
  // //       body: req.body,
  // //       machineState: app.stateMachine.getConfig(),
  // //     });
  // //   } catch (e) {
  // //     return res.code(500).send(e);
  // //   }
  // // });

  // // type ConfigBody = Config;

  // // app.post<{ Body: ConfigBody }>("/config", (req, res) => {
  // //   const { status } = req.body;

  // //   if (!status) {
  // //     return res.send(req.body);
  // //   }

  // //   if (status === "message") {
  // //     if (!req.body.message) {
  // //       return res.code(400).send({
  // //         status: "error",
  // //         message: "invalid message body param",
  // //         machineState: app.stateMachine.getConfig(),
  // //       });
  // //     }
  // //     app.stateMachine.setMessage(req.body.message);
  // //     messageHandler.setMessage(req.body.message);
  // //   } else if (status === "play") {
  // //     app.stateMachine.setState("play");
  // //   } else {
  // //     return res.send({
  // //       status: "error",
  // //       message: "unknown command",
  // //       machineState: app.stateMachine.getConfig(),
  // //     });
  // //   }

  // //   return res.send({ status: "ok", machineState: app.stateMachine.getConfig() });
  // // });

  // // type RemoveItemBody = {
  // //   type: SupportedDBCallbacks;
  // //   id: string;
  // // };

  // // app.post<{ Body: RemoveItemBody }>("/remove", async (req, res) => {
  // //   const { type, id } = req.body;
  // //   await app.db.deleteItem(type, id);

  // //   return res.status(200).send("ok");
  // // });

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
    // TODO temp disabling because errorCodes is undefined in raspberry
    // if (error instanceof errorCodes.FST_ERR_NOT_FOUND) {
    //   // Log error
    //   this.log.error(error);
    //   // Send error response
    //   reply.status(404).send({ ok: false });
    // } else {
    //   // fastify will use parent error handler to handle this
    //   Sentry.captureException(error);
    //   reply.send(error);
    // }
    if (process.env.NODE_ENV === "production") {
      // Sentry.captureException(error);
    }

    app.log.error(error);

    reply.send({
      statusCode: 500,
      error,
    });
  });

  return app;
}

export default getApp;
