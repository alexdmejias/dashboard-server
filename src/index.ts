// eslint-disable-next-line @typescript-eslint/no-var-requires
// const app = require("./dist/app.js").default;
import app from "./app";

const start = async () => {
  try {
    await app.listen({ port: 3000 });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
