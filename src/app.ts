import * as dotenv from "dotenv";
dotenv.config();

import fs from "node:fs";
import { join } from "path";
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
import StateMachine, { Config } from "./stateMachine";
import CallbackBase from "./callbacks/base";
import { SupportedDBCallbacks, SupportedViewTypes } from "./types";
import logger from "./logger";
import imagesPath from "./utils/imagesPath";
import db from "./db";

const app = fastify({ logger });

const messageHandler = new CallbackMessage();
const machine = new StateMachine();

const availableCallbacks = {
  reddit: new CallbackReddit(),
  quote: new CallbackQuote(),
  joke: new CallbackJoke(),
  word: new CallbackWord(),
  year: new CallbackYearProgress(),
  "on-this-day": new CallbackOnThisDay(),
  weather: new CallbackWeather(),
  fact: new CallbackFact(),
  message: messageHandler,
};

machine.addCallbacks(Object.values(availableCallbacks));

app.register(fastifyStatic, {
  root: join(__dirname, "../public"),
  prefix: "/public/",
});

app.register(fastifyView, {
  engine: {
    ejs: require("ejs"),
  },
});

function getMainImage() {
  return fs.readFileSync(join(__dirname, "../", imagesPath()));
}

app.get("/", async (req, res) => {
  const state = machine.getState();
  logger.error(`config.status: ${state.status}`);

  if (state.status === "message") {
    // TODO this should part of the message class
    if (state.message) {
      await messageHandler.render("png");
    } else {
      logger.error("tried to render a message but a message has not been set");
    }
  } else {
    await machine.tick();

    machine.advanceCallbackIndex();
  }

  res.headers({
    "Content-Type": "image/png",
    "x-server-command": "image",
  });

  return getMainImage();
});

type TestParams = {
  name: keyof typeof availableCallbacks;
  viewType: SupportedViewTypes;
};

app.get<{
  Params: TestParams;
  Querystring: Record<string, string | undefined>;
}>("/test/:name/:viewType?", async (req, res) => {
  const { name, viewType = "json" } = req.params;
  const { message = "" } = req.query;

  let callback!: CallbackBase;

  if (availableCallbacks[name]) {
    callback = availableCallbacks[name];
  } else if (name === "message") {
    messageHandler.setMessage(
      message ||
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Interdum posuere lorem ipsum dolor. Mauris pellentesque pulvinar pellentesque habitant morbi tristique senectus et."
    );

    callback = messageHandler;
  }

  if (!callback) {
    throw new Error("this callback has not been added to the test route");
  }

  const renderResult = await callback.render(viewType);

  if (viewType === "png") {
    res.type("image/png");
  } else if (viewType === "html") {
    res.type("text/html");
  }

  if (viewType === "png") {
    return fs.readFileSync(join(__dirname, "..", renderResult as string));
  } else {
    return res.send(renderResult);
  }
});

app.get("/config", (req, res) => {
  res.send(machine.getState());
});

type ConfigBody = Config;

app.post<{ Body: ConfigBody }>("/config", (req, res) => {
  const { status } = req.body;

  if (status === "message") {
    machine.setState({
      status: "message",
      message: req.body.message,
    });
    messageHandler.setMessage(req.body.message);
  } else if (status === "play") {
    machine.setState({
      status: "play",
    });
  } else {
    return res.send({ status: "error", message: "unknown command" });
  }

  res.send({ status: "ok" });
});

type RemoveItemBody = {
  type: SupportedDBCallbacks;
  id: string;
};

app.post<{ Body: RemoveItemBody }>("/remove", async (req, res) => {
  const { type, id } = req.body;
  await db.deleteItem(type, id);

  return res.status(200).send("ok");
});

app.setErrorHandler(function (error, request, reply) {
  if (error instanceof errorCodes.FST_ERR_NOT_FOUND) {
    // Log error
    this.log.error(error);
    // Send error response
    reply.status(404).send({ ok: false });
  } else {
    // fastify will use parent error handler to handle this
    reply.send(error);
  }
});

export default app;
