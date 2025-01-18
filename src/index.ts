import getApp from "./app";
import * as dotenv from "dotenv";
import {
  CallbackReddit,
  CallbackQuote,
  CallbackJoke,
  CallbackWord,
  CallbackYearProgress,
  CallbackOnThisDay,
  CallbackWeather,
  CallbackFact,
} from "./callbacks";
dotenv.config();

const start = async () => {
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

  const app = getApp(possibleCallbacks);
  try {
    await app.listen({ port: process.env.PORT || 3333, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};
start();
