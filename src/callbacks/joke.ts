import { Logger } from "pino";
import CallbackBase from "./base";

type Joke = string[];

class CallbackJoke extends CallbackBase {
  constructor(logger: Logger) {
    super({ name: "joke", template: "message", dataFile: "jokes", logger });
  }

  async getData() {
    try {
      const data = await this.getItemFromFile<Joke>();

      return data;
    } catch (e) {
      if (e instanceof Error) {
        return { error: e.message };
      } else if (typeof e === "string") {
        return { error: e };
      }
      return {};
    }
  }
}

export default CallbackJoke;
