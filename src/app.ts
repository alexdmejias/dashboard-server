import * as Sentry from "@sentry/node";
import * as dotenv from "dotenv";
import "./instrument";
dotenv.config();

import fastifyStatic from "@fastify/static";
import fastifyView from "@fastify/view";
import fastifySensible from "@fastify/sensible";
import fastify, { FastifyReply } from "fastify";
import fs from "node:fs/promises";
import { resolve } from "node:path";
import { CallbackMessage } from "./callbacks";
import CallbackBase, { RenderResponse } from "./callbacks/base";
import CallbackBaseDB from "./callbacks/base-db";
import logger, { loggingOptions } from "./logger";
import StateMachine from "./stateMachine";
import { SupportedViewType } from "./types";
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
} as const;

function getApp(possibleCallbacks: any[] = []) {
  if (!possibleCallbacks.length) {
    throw new Error("no callbacks provided");
  }

  const app = fastify({
    logger: process.env.NODE_ENV === "test" ? undefined : loggingOptions,
  });

  if (process.env.SENTRY_DSN && process.env.NODE_ENV === "production") {
    Sentry.setupFastifyErrorHandler(app);
  }

  const messageHandler = new CallbackMessage();

  app.decorate("clients", {});

  app.decorateReply(
    "internalServerError",
    function (this: FastifyReply, message: string) {
      return this.code(500).send({
        error: "Internal Server Error",
        message,
        statusCode: 500,
      });
    }
  );

  app.decorateReply("notFound", function (this: FastifyReply, message: string) {
    return this.code(404).send({
      error: "Not Found",
      message,
      statusCode: 404,
    });
  });

  function getClient(clientName: string): StateMachine | undefined {
    return app.clients[clientName];
  }

  async function registerClient(clientName: string) {
    app.log.info(`registering client: ${clientName}`);
    app.clients[clientName] = new StateMachine();
    const client = app.clients[clientName];
    app.log.info(`created new client: ${clientName}`);

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
  }

  app.addHook("onListen", async () => {
    app.log.info("app is ready");
    // await app.stateMachine.start();
    await registerClient("inkplate");
  });

  app.register(fastifySensible);
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
    return res.send({ statusCode: 200, message: serverMessages.healthGood });
  });

  app.get<{
    Params: {
      clientName: string;
    };
  }>("/register/:clientName", async (req, res) => {
    const { clientName } = req.params;
    const client = getClient(clientName);
    if (!client) {
      await registerClient(clientName);
      return {
        statusCode: 200,
        message: serverMessages.createdClient(clientName),
      };
    }

    app.log.info(`client already exists: ${clientName}`);
    return res.internalServerError(
      serverMessages.duplicateClientName(clientName)
    );
  });

  app.get<{
    Params: {
      clientName: string;
      viewType: SupportedViewType;
    };
  }>("/display/:clientName/:viewType", async (req, res) => {
    const { clientName, viewType } = req.params;

    if (!isSupportedViewType(viewType)) {
      app.log.error(`viewType not supported: ${viewType}`);
      return res.internalServerError(
        serverMessages.viewTypeNotSupported(viewType)
      );
    }

    // INFO hack to accomodate inkplate limitations with response having to have a .png extension
    const viewTypeToUse =
      (viewType as unknown) === "png.png" ? "png" : viewType;

    const client = getClient(clientName);
    if (!client) {
      app.log.error("client not found");
      return res.notFound(serverMessages.clientNotFound(clientName));
    } else {
      app.log.info(`retrieved existing client: ${clientName}`);
    }

    const data = await client.tick(viewTypeToUse);
    client.advanceCallbackIndex();

    app.log.info(
      `sending: ${data} | client: ${clientName} | requested viewType: ${viewTypeToUse}`
    );
    return getResponseFromData(res, data);
  });

  async function getResponseFromData(res: FastifyReply, data: RenderResponse) {
    if (isSupportedImageViewType(data.viewType) && "imagePath" in data) {
      return res
        .type(`image/${data.viewType}`)
        .send(await fs.readFile(data.imagePath));
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
    if (process.env.NODE_ENV === "production") {
      Sentry.captureException(error);
    }
    // console.log("&&&&&&&&", { error });
    reply.send(error);
  });

  return app;
}

export default getApp;
