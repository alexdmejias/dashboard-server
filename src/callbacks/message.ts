import { Logger } from "pino";
import CallbackBase from "./base";

class CallbackMessage extends CallbackBase {
  lastMessage: string[];

  constructor(logger: Logger) {
    super({ name: "message", inRotation: false, logger });
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
