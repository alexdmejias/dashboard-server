import type CallbackBase from "./base-callbacks/base";
import type { RenderResponse } from "./base-callbacks/base";
import logger from "./logger";
import type {
  Playlist,
  PlaylistItem,
  SupportedViewType,
  ValidCallback,
} from "./types";

export type Config = {
  rotation: string[];
  message: string;
  currCallbackIndex: number;
  playlist: Playlist;
};

class StateMachine {
  callbacks: Record<string, { name: string; instance: CallbackBase }>;
  #config: Config;

  constructor(playlist: Playlist = []) {
    this.callbacks = {};
    this.#config = {
      message: "",
      rotation: [],
      currCallbackIndex: 0,
      playlist,
    };
  }

  setMessage(message: string) {
    this.#config.message = message;
  }

  getConfig() {
    return this.#config;
  }

  setConfigOption<T extends keyof Config>(
    configKey: T,
    configValue: Config[T],
  ) {
    this.#config[configKey] = configValue;
  }

  async addCallbacks(validCallbacks: ValidCallback[]) {
    for await (const cb of validCallbacks) {
      this.callbacks[cb.id] = {
        name: cb.name,
        instance: cb.instance,
      };
      logger.info(`added callback ${cb.name} with key: ${cb.id}`);
    }
  }

  hasCallback(cbName: string) {
    return cbName in this.callbacks;
  }

  getCallbackFromId(callbackId: string) {
    return this.callbacks[callbackId];
  }

  getCallbackInstance(callbackId: string): CallbackBase | undefined {
    return this.getCallbackFromId(callbackId)?.instance;
  }

  getPlaylistItemById(id: string): PlaylistItem | undefined {
    return this.#config.playlist.find((item) => item.id === id);
  }

  async tick(viewType: SupportedViewType): Promise<RenderResponse> {
    const playlistItem = this.#config.playlist[this.#config.currCallbackIndex];

    if (!playlistItem) {
      logger.error("no playlist item found for current index");
      return {
        error: "no playlist item found for current index",
        viewType: "error",
      };
    }
    const selectedInstance = this.getCallbackInstance(playlistItem.id);
    if (!selectedInstance) {
      logger.error(`callback not found: ${playlistItem.callbackName}`);
      return {
        error: `callback not found: ${playlistItem.callbackName}`,
        viewType: "error",
      };
    }

    this.#config.currCallbackIndex++;
    if (this.#config.currCallbackIndex >= this.#config.playlist.length) {
      this.#config.currCallbackIndex = 0;
    }
    return selectedInstance.render(viewType, playlistItem.options);
  }

  advanceCallbackIndex() {
    this.#config.currCallbackIndex++;

    if (this.#config.currCallbackIndex + 1 > this.#config.rotation.length) {
      this.#config.currCallbackIndex = 0;
    }
  }
}

export default StateMachine;
