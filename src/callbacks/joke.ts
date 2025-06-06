import CallbackBaseDB from "../base-callbacks/base-db";

type DBTableShape = { id: string; content: string };
type Joke = { id: string; content: string[] };

class CallbackJoke extends CallbackBaseDB<DBTableShape, Joke> {
  constructor() {
    super({ name: "joke", dataFile: "jokes", template: "generic" });
  }

  transformer(data: DBTableShape): Joke {
    return {
      id: data.id,
      content: data.content.split("\\n"),
    };
  }

  get migration() {
    return `CREATE TABLE IF NOT EXISTS ${this.dataFile} (
        id INTEGER PRIMARY KEY,
        content TEXT NOT NULL)`;
  }
}

export default CallbackJoke;
