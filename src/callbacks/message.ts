import CallbackBase from "./base";

class CallbackMessage extends CallbackBase {
  lastMessage: string[];

  constructor() {
    super("message", "message");
    this.lastMessage = [];
    this.inRotation = false;
  }

  async getData() {
    return this.lastMessage;
  }

  setMessage(message: string) {
    this.lastMessage = [message];
  }
}

export default CallbackMessage;
