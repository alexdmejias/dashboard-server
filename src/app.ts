import * as dotenv from "dotenv"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config();
import express from "express";
import path, { join } from "path";
import bodyParser from "body-parser";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

import {
  CallbackReddit,
  CallbackQuote,
  CallbackYearProgress,
  CallbackMessage,
} from "./callbacks/index.js";
import StateMachine from "./stateMachine.js";

const app = express();

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

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

app.set("view engine", "ejs");

app.get("/", async (req, res) => {
  if (config.status === "play") {
    const dataFromTick = await machine.tick();
    res.send({
      data: dataFromTick,
    });
  } else if (config.status === "message" && config.message) {
    messageHandler.setMessage(config.message);
    const dataFromRender = await messageHandler.render(
      machine.getState(),
      machine.setState
    );

    res.send({
      data: dataFromRender,
    });
  }
});

app.get("/callbacks/:name/:data?", async (req, res) => {
  const { name, data } = req.params;
  const buff = Buffer.from(decodeURIComponent(data || ""), "base64");
  const text = buff.toString("utf8");

  const parsedData = JSON.parse(text || "{}");

  // TODO
  res.render(data ? name : "index", {
    name: req.params.name,
    data: parsedData,
  });
});

const quote = new CallbackQuote();

app.get("/test/:name/:viewType?", async (req, res) => {
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
    res.render(name, {
      name,
      data,
    });
  } else {
    res.send(data);
  }
});

app.get("/config", (req, res) => {
  res.send(config);
});

app.post("/config", (req, res) => {
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

app.use("/public", express.static(join(__dirname, "public")));

app.use((req, res, next) => {
  res.send("<h1> Page not found </h1>");
});

export default app;
