// Load environment variables from .env file first (before any other imports)

import path from "node:path";
import dotenv from "dotenv";

// When running from dist/, look for .env in parent directory
const envPath = path.resolve(__dirname, "../.env");
const envResult = dotenv.config({ path: envPath });
if (envResult.parsed) {
  console.log(`[dotenv] Loaded ${envPath}:`, envResult.parsed);
} else if (envResult.error) {
  console.warn(`[dotenv] Failed to load ${envPath}:`, envResult.error.message);
}

import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import getApp from "./app";
import { getSettings, initSettings } from "./settings";
import type { PossibleCallbacks } from "./types";

const start = async () => {
  // Initialise the settings store before any other module reads settings
  await initSettings();
  console.log("[settings] Loaded settings:", getSettings());
  const callbacks: { callbackName: string }[] = [
    { callbackName: "reddit" },
    { callbackName: "weather" },
    { callbackName: "year-progress" },
    { callbackName: "calendar" },
    { callbackName: "todoist" },
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
      defaultOptions: asyncResult.default.defaultOptions,
    };
  }

  const app = await getApp(possibleCallbacks);
  try {
    const port = process.env.PORT || 3333;

    await app.listen({ port, host: "0.0.0.0" });

    const initPayloadPath = process.env.INIT_PAYLOAD_FILE || "./init-payload.json";

    // A bind-mounted path that doesn't exist yet on the host (e.g. a fresh
    // Docker/Portainer deploy before the file has been created) gets
    // auto-vivified by Docker as an empty directory rather than a file, so
    // existsSync alone isn't enough — check isFile() too, otherwise readFile
    // throws EISDIR and crash-loops the container.
    if (existsSync(initPayloadPath) && statSync(initPayloadPath).isFile()) {
      const fileContents = await readFile(initPayloadPath, "utf-8");
      const initPayload = JSON.parse(fileContents) as any[];
      initPayload.forEach(async (item) => {
        await app.inject(item);
      });
    } else {
      app.log.warn(
        `No init-payload.json file found at ${initPayloadPath}. Skipping initial payload injection.`,
      );
    }

    app.log.info(`Server running on port ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
