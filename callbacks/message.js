import CallbackBase from "./base.js";

class CallbackMessage extends CallbackBase {
  constructor() {
    super("message");
    this.lastMessage = "";
    this.inRotation = false;
  }

  async getData() {
    return this.lastMessage;
  }

  setMessage(message) {
    this.lastMessage = message;
  }
}

export default CallbackMessage;
