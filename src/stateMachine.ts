// import CallbackMessage from "./callbacks/message";
import CallbackBase, { RenderResponse } from "./base-callbacks/base";
import logger from "./logger";
import { Playlist, SupportedViewType } from "./types";

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
  playlist: Playlist;
};

class StateMachine {
  // currCallbackIndex: number;
  callbacks: Record<string, CallbackBase>;
  #config: Config;
  // rotation: string[];
  timer: NodeJS.Timeout | undefined;

  constructor(playlist: Playlist = []) {
    // this.currCallbackIndex = 0;
    this.callbacks = {};
    this.#config = {
      status: "play",
      message: "",
      rotation: [],
      currCallbackIndex: 0,
      playlist: playlist,
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
    // logger.info(
    //   `adding callback ${callbackInstance.name} in rotation?", ${callbackInstance.inRotation}`
    // );
    if (!this.callbacks[callbackInstance.name]) {
      this.callbacks[callbackInstance.name] = callbackInstance;
      // if (callbackInstance.inRotation) {
      //   this.#config.rotation.push(callbackInstance.name);
      // }
    } else {
      logger.warn(
        `attempting to add callback that already exists: ${callbackInstance.name}`
      );
    }
  }

  async addCallbacks(callbackInstances: CallbackBase[]) {
    for await (const cb of callbackInstances) {
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

  getCallbackInstanceByName(name: string): CallbackBase | undefined {
    if (this.callbacks[name]) {
      return this.callbacks[name];
    }
    logger.warn(`callback not found: ${name}`);
    return undefined;
  }

  async tick(viewType: SupportedViewType): Promise<RenderResponse> {
    // const selectedInstance = getCallbackInstanceByName()
    // this.callbacks[this.#config.rotation[this.#config.currCallbackIndex]];
    // logger.trace("tick");
    const playlistItem = this.#config.playlist[this.#config.currCallbackIndex];

    if (!playlistItem) {
      logger.error("no playlist item found for current index");
      return { error: { error: "wasd" }, viewType: "error" };
    }
    const selectedInstance = this.getCallbackInstanceByName(
      playlistItem.callbackName
    );
    if (!selectedInstance) {
      logger.error(`callback not found: ${playlistItem.callbackName}`);
      return {
        error: { error: `callback not found: ${playlistItem.callbackName}` },
        viewType: "error",
      };
    }
    // try {
    // } catch (e) {
    //   // TODO should render error instance
    //   return selectedInstance.render("png", e);
    // }
    return selectedInstance.render(viewType /* playlistItem.options */);
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
