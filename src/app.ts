import * as dotenv from "dotenv"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config();
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
machine.addCallback(new CallbackYearProgress());
machine.addCallback(messageHandler);

machine.start();

type Config = {
  status: "play" | "message";
  message?: string;
};

const config: Config = {
  status: "message",
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

const quote = new CallbackQuote();

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
  } else if (name === "year") {
    callback = new CallbackYearProgress();
  } else if (name === "quote") {
    callback = quote;
  } else if (name === "message") {
    messageHandler.setMessage(
      message ||
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Interdum posuere lorem ipsum dolor. Mauris pellentesque pulvinar pellentesque habitant morbi tristique senectus et."
    );

    callback = messageHandler;
  }

  const renderResult = await callback.render(viewType);

  if (viewType === "png") {
    res.type("image/png");
  } else if (viewType === "html") {
    res.type("text/html");
  }

  return res.send(renderResult);
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
