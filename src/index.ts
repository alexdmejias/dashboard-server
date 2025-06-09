import getApp from "./app";
import * as dotenv from "dotenv";
import { PossibleCallbacks } from "./types";

dotenv.config();

const start = async () => {
  const callbacks: { callbackName: string }[] = [
    {
      callbackName: "reddit",
    },
    { callbackName: "weather" },
    { callbackName: "year-progress" },
  ];
  const possibleCallbacks: PossibleCallbacks = {};

  for await (const callback of callbacks) {
    const asyncResult = await import(
      `./callbacks/${callback.callbackName}/index.ts`
    );
    possibleCallbacks[callback.callbackName] = asyncResult.default;
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
