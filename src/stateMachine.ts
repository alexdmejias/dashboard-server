// import CallbackMessage from "./callbacks/message";
import CallbackBase from "./base-callbacks/base";
import CallbackBaseDB from "./base-callbacks/base-db";
import logger from "./logger";
import { SupportedViewType } from "./types";

// type ConfigPlay = {
//   status: "play";
// };

// type ConfigMessage = {
//   status: "message";
//   message: string;
// };

// type ConfigSleep = {
//   status: "sleep";
//   wakeupTime: number;
// };

export type Config = {
  status: "play" | "sleep" | "message";
  rotation: string[];
  message: string;
  currCallbackIndex: number;
};

class StateMachine {
  // currCallbackIndex: number;
  callbacks: Record<string, CallbackBase>;
  #config: Config;
  // rotation: string[];
  timer: NodeJS.Timeout | undefined;

  constructor() {
    // this.currCallbackIndex = 0;
    this.callbacks = {};
    this.#config = {
      status: "play",
      message: "",
      rotation: [],
      currCallbackIndex: 0,
    };

    // this.setState = this.setState.bind(this);
    // this.rotation = [];
  }

  setMessage(message: string) {
    this.#config.message = message;
  }

  setState(newConfig: Config["status"]) {
    this.#config.status = newConfig;
  }

  getConfig() {
    return this.#config;
  }

  setConfigOption<T extends keyof Config>(
    configKey: T,
    configValue: Config[T]
  ) {
    this.#config[configKey] = configValue;
  }
  // setConfig(newState: Partial<Config>) {
  //   // TODO validate config
  //   this.#config = {...this.#config, ...newState};
  // }

  // add method to get logs

  addCallback(callbackInstance: CallbackBase) {
    logger.info(
      `adding callback ${callbackInstance.name} in rotation?", ${callbackInstance.inRotation}`
    );
    if (!this.callbacks[callbackInstance.name]) {
      this.callbacks[callbackInstance.name] = callbackInstance;
      if (callbackInstance.inRotation) {
        this.#config.rotation.push(callbackInstance.name);
      }
    } else {
      logger.warn(
        `attempting to add callback that already exists: ${callbackInstance.name}`
      );
    }
  }

  async addCallbacks(callbackInstances: (CallbackBase | CallbackBaseDB)[]) {
    for await (const cb of callbackInstances) {
      if ("runMigration" in cb) {
        logger.info(`found migration in ${cb.name}`);
        await cb.runMigration();
        // console.log(result)
      }
      this.addCallback(cb);
    }
  }

  hasCallback(cbName: string) {
    return cbName in this.callbacks;
  }

  setRotation(newRotation: string[]) {
    const output = this.validateRotation(newRotation);
    if (typeof output === "string") {
      throw new Error("invalid rotation value:" + output);
    }

    this.setConfigOption("rotation", newRotation);
  }

  validateRotation(newRotation: string[]) {
    for (let i = 0; i < newRotation.length; i++) {
      if (!this.callbacks[newRotation[i]]) {
        return newRotation[i];
      }
    }

    return true;
  }

  getCallbackInstance(callbackName: string): CallbackBase | undefined {
    return this.callbacks[callbackName];
  }

  getCurrCallbackInstance(): CallbackBase | undefined {
    return this.callbacks[
      this.#config.rotation[this.#config.currCallbackIndex]
    ];
  }

  async tick(viewType: SupportedViewType) {
    console.log(
      "@@@@@@@@",
      this.callbacks,
      this.#config.rotation,
      this.#config.currCallbackIndex
    );
    const selectedInstance =
      this.callbacks[this.#config.rotation[this.#config.currCallbackIndex]];
    logger.trace("tick");

    // try {
    return selectedInstance.render(viewType);
    // } catch (e) {
    //   // TODO should render error instance
    //   return selectedInstance.render("png", e);
    // }
  }

  advanceCallbackIndex() {
    this.#config.currCallbackIndex++;

    if (this.#config.currCallbackIndex + 1 > this.#config.rotation.length) {
      this.#config.currCallbackIndex = 0;
    }
  }

  start() {
    this.timer = setInterval(() => {
      this.#config.currCallbackIndex++;

      if (this.#config.currCallbackIndex + 1 > this.#config.rotation.length) {
        this.#config.currCallbackIndex = 0;
      }
    }, 1000);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  renderError(errorMessage: string, viewType: SupportedViewType) {
    // const cb = new CallbackMessage();
    // cb.callbacksmessageerrorMessage);
    // return cb.render(viewType);
  }
}

export default StateMachine;
