import getApp from "./app";
import * as dotenv from "dotenv";

dotenv.config();

const start = async () => {
  const callbacks = ["reddit", "weather", "year-progress"];
  const possibleCallbacks = [];

  for await (const callback of callbacks) {
    const asyncResult = await import(`./callbacks/${callback}`);
    possibleCallbacks.push(asyncResult.default);
  }

  const app = await getApp(possibleCallbacks);
  try {
    await app.listen({ port: process.env.PORT || 3333, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
