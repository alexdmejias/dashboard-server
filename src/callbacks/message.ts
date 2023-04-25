import CallbackBase from "./base";

class CallbackMessage extends CallbackBase {
  lastMessage: string[];

  constructor() {
    super({ name: "message", inRotation: false });
    this.lastMessage = [];
  }

  async getData() {
    return { index: 0, item: this.lastMessage };
  }

  setMessage(message: string) {
    this.lastMessage = [message];
  }
}

export default CallbackMessage;
