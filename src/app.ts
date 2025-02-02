import * as dotenv from "dotenv";
dotenv.config();
import "./instrument";
import * as Sentry from "@sentry/node";

import fs from "node:fs/promises";
import { resolve } from "node:path";
import fastify, { errorCodes, FastifyReply } from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyView from "@fastify/view";
import { CallbackMessage } from "./callbacks";
import StateMachine from "./stateMachine";
import CallbackBase, { RenderResponse } from "./callbacks/base";
import { SupportedViewTypes } from "./types";
import logger, { loggingOptions } from "./logger";
import CallbackBaseDB from "./callbacks/base-db";
import { isSupportedViewTypes } from "./utils/isSupportedViewTypes";

function getApp(possibleCallbacks: any[] = []) {
  if (!possibleCallbacks.length) {
    throw new Error("no callbacks provided");
  }
  const app = fastify({ logger: loggingOptions });

  if (process.env.SENTRY_DSN && process.env.NODE_ENV === "production") {
    Sentry.setupFastifyErrorHandler(app);
  }

  const messageHandler = new CallbackMessage();

  app.decorate("clients", {});

  app.register(fastifyStatic, {
    root: resolve("./public"),
    prefix: "/public/",
  });

  app.register(fastifyView, {
    engine: {
      ejs: require("ejs"),
    },
  });

  app.get("/health", async (req, res) => {
    return res.status(200).send("ok");
  });

  app.get<{
    Params: {
      clientName: string;
    };
  }>("/register/:clientName", async (req, res) => {
    const { clientName } = req.params;
    let client = app.clients[clientName];
    if (!client) {
      app.clients[clientName] = new StateMachine();
      client = app.clients[clientName];
      logger.info(`created new client: ${clientName}`);

      const validCallbacks: (CallbackBase | CallbackBaseDB)[] = [];
      possibleCallbacks.forEach((callback) => {
        try {
          const ins = new callback();
          validCallbacks.push(ins);
        } catch (e) {
          if (process.env.NODE_ENV !== "production") {
            console.error(e);
          }
        }
      });

      await client.addCallbacks(validCallbacks);
    } else {
      logger.info(`retrieved existing client: ${clientName}`);
    }

    return res.status(200).send("ok");
  });

  app.get<{
    Params: {
      clientName: string;
      viewType: SupportedViewTypes;
    };
  }>("/display/:clientName/:viewType", async (req, res) => {
    const { clientName, viewType } = req.params;

    if (!isSupportedViewTypes(viewType)) {
      logger.error(`viewType not supported: ${viewType}`);
      return res.status(500).send({
        error: `viewType not supported: ${viewType}`,
      });
    }

    // INFO hack to accomodate inkplate limitations
    const viewTypeToUse =
      (viewType as unknown) === "png.png" ? "png" : viewType;

    const client = app.clients[clientName];
    if (!client) {
      logger.error("client not found");
      return res.status(401).send("client not found");
    } else {
      logger.info(`retrieved existing client: ${clientName}`);
    }

    const data = await client.tick(viewTypeToUse);
    client.advanceCallbackIndex();

    logger.info(
      `sending: ${data} | client: ${clientName} | requested viewType: ${viewTypeToUse}`
    );
    return getResponseFromData(res, data);
  });

  function getClient(clientName: string): StateMachine {
    return app.clients[clientName];
  }

  async function getResponseFromData(res: FastifyReply, data: RenderResponse) {
    if (data.viewType === "png" && "imagePath" in data) {
      return res.type("image/png").send(await fs.readFile(data.imagePath));
    } else if (data.viewType === "html" && "html" in data) {
      return res.type("text/html").send(data.html);
    } else {
      return res.send(data);
    }
  }

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

  app.get("/api/clients", (req, res) => {
    res.send({
      data: {
        clients: Object.keys(app.clients),
      },
    });
  });

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

  if (process.env.NODE_ENV === "production") {
    app.setErrorHandler(function (error, request, reply) {
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
      Sentry.captureException(error);
      reply.send(error);
    });
  }

  return app;
}

export default getApp;
