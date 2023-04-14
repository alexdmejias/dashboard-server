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
} from "./callbacks/index.js";
import StateMachine from "./stateMachine.js";

const app = fastify({ logger: false });
const messageHandler = new CallbackMessage();
const machine = new StateMachine();

machine.addCallback(new CallbackReddit());
machine.addCallback(new CallbackQuote());
machine.addCallback(new CallbackYearProgress());
machine.addCallback(messageHandler);

machine.start();

const config = {
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

app.get("/", async (req, res) => {
  if (config.status === "play") {
    const dataFromTick = await machine.tick();
    res.send({
      data: dataFromTick,
    });
  } else if (config.status === "message" && config.message) {
    messageHandler.setMessage(config.message);
    const dataFromRender = await messageHandler.render();

    res.send({
      data: dataFromRender,
    });
  }
});

const quote = new CallbackQuote();

type TestParams = {
  name: string;
  viewType: "json" | "html";
};
app.get<{ Params: TestParams }>("/test/:name/:viewType?", async (req, res) => {
  const { name, viewType = "json" } = req.params;

  let data = {};

  if (name === "reddit") {
    data = await new CallbackReddit().getData();
  } else if (name === "year") {
    data = await new CallbackYearProgress().getData();
  } else if (name === "quote") {
    data = await quote.getData();
  } else if (name === "message") {
    messageHandler.setMessage(
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Interdum posuere lorem ipsum dolor. Mauris pellentesque pulvinar pellentesque habitant morbi tristique senectus et."
    );

    data = await messageHandler.getData();
  }

  // TODO add an image viewType to see the rendered image
  if (viewType === "html") {
    return res.view(`/views/${name}.ejs`, {
      name,
      data,
    });
  } else {
    return res.send(data);
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
