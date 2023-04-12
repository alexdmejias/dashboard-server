// eslint-disable-next-line @typescript-eslint/no-var-requires
const app = require('./dist/app.js').default;

app.listen(3000, () => {
  console.log(`Example app listening on port ${3000}`);
});
