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
} from "./callbacks/index.js";
import StateMachine from "./stateMachine";
import CallbackBase from "./callbacks/base";
import { SupportedViewTypes } from "./types";

const app = fastify({ logger: true });
const messageHandler = new CallbackMessage();
const machine = new StateMachine();

machine.addCallback(new CallbackReddit());
machine.addCallback(new CallbackQuote());
machine.addCallback(new CallbackJoke());
machine.addCallback(new CallbackWord());
machine.addCallback(new CallbackYearProgress());
machine.addCallback(new CallbackOnThisDay());
machine.addCallback(messageHandler);

machine.start();

type Config = {
  status: "play" | "message";
  message?: string;
};

const config: Config = {
  status: "play",
  message: "initial message",
};

app.register(fastifyStatic, {
  root: join(__dirname, "../public"),
  prefix: "/public/",
});

app.register(fastifyView, {
  engine: {
    ejs: require("ejs"),
  },
});

type IndexQuery = {
  message?: string;
};

app.get<{ Querystring: IndexQuery }>("/", async (req, res) => {
  const { message } = req.query;

  if (config.status === "play") {
    const dataFromTick = await machine.tick();

    res.send({
      path: dataFromTick,
    });
  } else if (config.status === "message" && (message || config.message)) {
    messageHandler.setMessage(message || config.message || "");
    const dataFromRender = await messageHandler.render("png");

    res.send({
      path: dataFromRender,
    });
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

  let callback!: CallbackBase;

  if (name === "reddit") {
    callback = new CallbackReddit();
  } else if (name === "joke") {
    callback = new CallbackJoke();
  } else if (name === "word") {
    callback = new CallbackWord();
  } else if (name === "year") {
    callback = new CallbackYearProgress();
  } else if (name === "quote") {
    callback = new CallbackQuote();
  } else if (name === "on-this-day") {
    callback = new CallbackOnThisDay();
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
  res.send(config);
});

type ConfigBody = {
  command: "play" | "message";
  message: string;
  until?: number;
};

app.post<{ Body: ConfigBody }>("/config", (req, res) => {
  const { command, message, until } = req.body;

  if (command === "message") {
    if (!message) {
      return res.send({ status: "error", message: "empty message" });
    }
    config.message = message;
    config.status = command;
  } else if (command === "play") {
    config.message = "";
    config.status = command;
  } else {
    return res.send({ status: "error", message: "unknown command" });
  }

  res.send({ status: "ok" });
});

app.post("/remove-item/:type/:index", (req, res) => {
  return res.status(200);
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
