import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import * as dotenv from "dotenv";
import getApp from "./app";
import type { PossibleCallbacks } from "./types";

dotenv.config();

const start = async () => {
  const callbacks: { callbackName: string }[] = [
    { callbackName: "reddit" },
    { callbackName: "weather" },
    { callbackName: "year-progress" },
    { callbackName: "calendar" },
  ];
  const possibleCallbacks: PossibleCallbacks = {};
  const currentExtension = __filename.endsWith(".ts") ? "ts" : "js";

  for await (const callback of callbacks) {
    const asyncResult = await import(
      `./callbacks/${callback.callbackName}/index.${currentExtension}`
    );
    possibleCallbacks[callback.callbackName] = {
      name: callback.callbackName,
      expectedConfig: asyncResult.expectedConfig,
      callback: asyncResult.default,
    };
  }

  const app = await getApp(possibleCallbacks);
  try {
    const port = process.env.PORT || 3333;
    await app.listen({ port, host: "0.0.0.0" });

    if (existsSync("./init-payload.json")) {
      const fileContents = await readFile("./init-payload.json", "utf-8");
      const initPayload = JSON.parse(fileContents) as any[];
      initPayload.forEach(async (item) => {
        await app.inject(item);
      });
    }

    app.log.info(`Server running on port ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
