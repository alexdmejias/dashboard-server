import CallbackBaseDB from "./base-db";

type Joke = string[];

class CallbackJoke extends CallbackBaseDB<Joke> {
  constructor() {
    super({ name: "joke", dataFile: "jokes", template: "generic" });
  }
}

export default CallbackJoke;
