import CallbackBase from "./base";

class CallbackJoke extends CallbackBase {
  constructor() {
    super("joke", "message");
  }

  async getData() {
    return ["knock knock"];
  }
}

export default CallbackJoke;
