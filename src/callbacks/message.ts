import CallbackBase from "../base-callbacks/base";

class CallbackMessage extends CallbackBase {
  lastMessage: string[];

  constructor() {
    super({ name: "message", inRotation: false, template: "generic" });
    this.lastMessage = [];
  }

  async getData() {
    return { content: this.lastMessage };
  }

  setMessage(message: string) {
    this.lastMessage = [message];
  }
}

export default CallbackMessage;
