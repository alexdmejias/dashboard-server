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
    const port = process.env.PORT || 3333;
    await app.listen({ port, host: "0.0.0.0" });

    // await fetch(`http://localhost:${port}/register/inkplate`, {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({
    //     playlist: [
    //       {
    //         id: "reddit-programming",
    //         callbackName: "reddit",
    //         options: {
    //           subreddit: "programming",
    //           qty: 5,
    //         },
    //       },
    //       {
    //         id: "reddit-wasd",
    //         callbackName: "wasd",
    //         options: {
    //           subreddit: "astoria",
    //           qty: 10,
    //         },
    //       },
    //     ],
    //   }),
    // });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
