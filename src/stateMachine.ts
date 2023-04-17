import CallbackBase from "./callbacks/base";

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
    console.log(
      "@@@@@@@@",
      "adding callback",
      callbackInstance.name,
      "in rotation?",
      callbackInstance.inRotation
    );
    if (!this.callbacks[callbackInstance.name]) {
      this.callbacks[callbackInstance.name] = callbackInstance;
      if (callbackInstance.inRotation) {
        this.rotation.push(callbackInstance.name);
      }
    } else {
      console.log("!!!!!!!!", callbackInstance.name, "was already added");
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

  getCallbackInstance(callbackName: string) {
    return this.callbacks[callbackName];
  }

  async tick() {
    console.log("@@@@@@@@", "rotation:", this.rotation);
    const selectedInstance =
      this.callbacks[this.rotation[this.currCallbackIndex]];
    console.log("!!!!!!!!", "tick", this.currCallbackIndex, selectedInstance);
    //TODO follow a custom rotation, ie: quote, quote, year, reddit

    const output = await selectedInstance.render("png");

    return output;
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
