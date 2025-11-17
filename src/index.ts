import * as dotenv from "dotenv";
import getApp from "./app";
import type { PossibleCallbacks } from "./types";

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

    app.inject({
      path: "/register/inkplate",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        playlist: [
          {
            id: "astoria",
            callbackName: "reddit",
            options: {
              qty: 2,
              title: "astoria posts",
              subreddit: "astoria",
            },
          },
          {
            id: "asknyc",
            callbackName: "reddit",
            options: {
              qty: 10,
              subreddit: "asknyc",
            },
          },
        ],
      },
    });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
