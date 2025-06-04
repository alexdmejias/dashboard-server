import getApp from "./app";
import * as dotenv from "dotenv";

dotenv.config();

const start = async () => {
  const callbacks: { callbackName: string; options?: object }[] = [
    {
      callbackName: "reddit",
      options: {
        subreddit: "astoria",
        qty: 10,
      },
    },
    { callbackName: "weather", options: { zipcode: "11106" } },
    { callbackName: "year-progress" },
  ];
  const possibleCallbacks = [];

  for await (const callback of callbacks) {
    const asyncResult = await import(
      `./callbacks/${callback.callbackName}/index.ts`
    );
    possibleCallbacks.push({
      callback: asyncResult.default,
      options: callback.options,
    });
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
