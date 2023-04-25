import CallbackBase from "./base";

type Joke = string[];

class CallbackJoke extends CallbackBase {
  constructor() {
    super({ name: "joke", template: "message", dataFile: "jokes" });
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
