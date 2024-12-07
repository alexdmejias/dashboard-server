// eslint-disable-next-line @typescript-eslint/no-var-requires
// const app = require("./dist/app.js").default;
import app from './src/app'

// app.listen(3000, () => {
//   console.log(`Example app listening on port ${3000}`);
// });

const start = async () => {
  try {
    await app.listen({ port: 3000 });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};
start();
