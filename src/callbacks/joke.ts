import CallbackBaseDB from "./base-db";

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
}

export default CallbackJoke;
