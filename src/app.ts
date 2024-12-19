import * as dotenv from "dotenv";
dotenv.config();
import "./instrument";
import * as Sentry from "@sentry/node";

import fs from "node:fs/promises";
import { resolve } from "node:path";
import fastify, { errorCodes } from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyView from "@fastify/view";
import {
  CallbackReddit,
  CallbackQuote,
  CallbackYearProgress,
  CallbackMessage,
  CallbackJoke,
  CallbackWord,
  CallbackOnThisDay,
  CallbackWeather,
  CallbackFact,
} from "./callbacks";
import StateMachine from "./stateMachine";
import CallbackBase from "./callbacks/base";
import { SupportedViewTypes } from "./types";
import logger, { loggingOptions } from "./logger";
import CallbackBaseDB from "./callbacks/base-db";

const app = fastify({ logger: loggingOptions });

if (process.env.SENTRY_DSN) {
  Sentry.setupFastifyErrorHandler(app);
}

const messageHandler = new CallbackMessage();

app.decorate("stateMachine", new StateMachine());

app.register(fastifyStatic, {
  root: resolve("./public"),
  prefix: "/public/",
});

app.register(fastifyView, {
  engine: {
    ejs: require("ejs"),
  },
});

declare module "fastify" {
  interface FastifyInstance {
    stateMachine: StateMachine;
  }
}

app.addHook("onReady", async () => {
  const possibleCallbacks = [
    CallbackReddit,
    CallbackQuote,
    CallbackJoke,
    CallbackWord,
    CallbackYearProgress,
    CallbackOnThisDay,
    CallbackWeather,
    CallbackFact,
  ];

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
  await app.stateMachine.addCallbacks(validCallbacks);
});

app.get("/", async (req, res) => {
  const state = app.stateMachine.getConfig();
  logger.error(`config.status: ${state.status}`);

  let imagePath;
  if (state.status === "message") {
    // TODO this should part of the message class
    if (state.message) {
      imagePath = await messageHandler.render("png");
    } else {
      logger.error("tried to render a message but a message has not been set");
    }
  } else {
    imagePath = await app.stateMachine.tick();

    app.stateMachine.advanceCallbackIndex();
  }

  if (typeof imagePath === "string") {
    return res.type("image/png").send(await fs.readFile(imagePath));
  } else {
    return res.send(imagePath);
  }
});

type TestParams = {
  name: string;
  viewType: SupportedViewTypes;
};

app.get<{
  Params: TestParams;
  Querystring: Record<string, string | undefined>;
}>("/test/:name/:viewType?", async (req, res) => {
  const { name, viewType = "json" } = req.params;
  const { message = "" } = req.query;

  let callback: CallbackBase | undefined;

  if (app.stateMachine.hasCallback(name)) {
    callback = app.stateMachine.getCallbackInstance(name);
  } else if (name === "message") {
    messageHandler.setMessage(
      message ||
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Interdum posuere lorem ipsum dolor. Mauris pellentesque pulvinar pellentesque habitant morbi tristique senectus et."
    );

    callback = messageHandler;
  }

  if (!callback) {
    const errorMessage = `"${name}" callback has not been added to the test route, available callbacks are ${Object.keys(
      app.stateMachine.callbacks
    )}`;

    const output = await app.stateMachine.renderError(errorMessage, viewType);
    if (viewType === "html") {
      return fs.readFile(output as string);
    } else if (viewType === "png") {
      return res.type("image/png").send(await fs.readFile(output as string));
    } else {
      return res.send(errorMessage);
    }
  }

  const renderResult = await callback.render(viewType);

  if (viewType === "png" && typeof renderResult === "string") {
    return res.type("image/png").send(await fs.readFile(renderResult));
  } else {
    return res.send(renderResult);
  }
});

// app.get("/control", (req, res) => {
//   res.view("./views/control.html");
// });

// app.get("/config", (req, res) => {
//   res.send(app.stateMachine.getConfig());
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

export default app;
