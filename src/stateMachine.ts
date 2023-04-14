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
    this.callbacks[callbackInstance.name] = callbackInstance;
    if (callbackInstance.inRotation) {
      this.rotation.push(callbackInstance.name);
    }
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

    const output = await selectedInstance.render();

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
