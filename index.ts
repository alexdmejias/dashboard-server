import app from "./src/app";
import * as dotenv from "dotenv";
dotenv.config();

const start = async () => {
  try {
    await app.listen({ port: process.env.PORT || 3333, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};
start();
