import CallbackBase from "./base";

class CallbackMessage extends CallbackBase {
  lastMessage: string[];

  constructor() {
    super({ name: "message", template: "message", inRotation: false });
    this.lastMessage = [];
  }

  async getData() {
    return this.lastMessage;
  }

  setMessage(message: string) {
    this.lastMessage = [message];
  }
}

export default CallbackMessage;
