import CallbackBase from "./callbacks/base";
import logger from "./logger";

class StateMachine {
  currCallbackIndex: number;
  callbacks: Record<string, CallbackBase>;
  state: Record<string, string | number>;
  rotation: string[];
  timer: NodeJS.Timer | undefined;

  constructor() {
    this.currCallbackIndex = 0;
    this.callbacks = {};
    this.state = {};

    this.setState = this.setState.bind(this);
    this.rotation = [];
  }

  getState() {
    return this.state;
  }

  setState(newState: Record<string, string | number>) {
    this.state = newState;
  }

  addCallback(callbackInstance: CallbackBase) {
    logger.info(
      `adding callback ${callbackInstance.name} in rotation?", ${callbackInstance.inRotation}`
    );
    if (!this.callbacks[callbackInstance.name]) {
      this.callbacks[callbackInstance.name] = callbackInstance;
      if (callbackInstance.inRotation) {
        this.rotation.push(callbackInstance.name);
      }
    } else {
      logger.warn(
        `attempting to adding callback that already exists: ${callbackInstance.name}`
      );
    }
  }

  addCallbacks(callbackInstances: CallbackBase[]) {
    callbackInstances.forEach((cb) => this.addCallback(cb));
  }

  setRotation(newRotation: string[]) {
    if (this.validateRotation(newRotation)) {
      this.rotation = newRotation;
    }
  }

  validateRotation(newRotation: string[]) {
    for (let i = 0; i < newRotation.length; i++) {
      if (!this.callbacks[newRotation[i]]) {
        return false;
      }
    }

    return true;
  }

  getCallbackInstance(callbackName: string): CallbackBase | undefined {
    return this.callbacks[callbackName];
  }

  async tick() {
    const selectedInstance =
      this.callbacks[this.rotation[this.currCallbackIndex]];
    logger.trace("tick");
    //TODO follow a custom rotation, ie: quote, quote, year, reddit

    console.log("@@@@@@@@", "#tick", this.rotation);
    const output = await selectedInstance.render("png");

    return output;
  }

  advanceCallbackIndex() {
    this.currCallbackIndex++;

    console.log("^^^^^^^^", "increasing index");

    if (this.currCallbackIndex + 1 > this.rotation.length) {
      this.currCallbackIndex = 0;
      console.log("&&&&&&&&", "resetting index");
    }
  }

  start() {
    this.timer = setInterval(() => {
      this.currCallbackIndex++;

      if (this.currCallbackIndex + 1 > this.rotation.length) {
        this.currCallbackIndex = 0;
      }
    }, 1000);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }
}

export default StateMachine;
