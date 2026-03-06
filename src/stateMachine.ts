import path from "node:path";
import type CallbackBase from "./base-callbacks/base";
import type { RenderResponse } from "./base-callbacks/base";
import logger from "./logger";
import type {
  Playlist,
  PlaylistItem,
  SupportedViewType,
  ValidCallback,
} from "./types";
import { renderLiquidFile } from "./utils/getRenderedTemplate";
import { getScreenshotWithoutFetching } from "./utils/getScreenshot";
import { cleanupOldImages, getImagesPath } from "./utils/imagesPath";
import { isSupportedImageViewType } from "./utils/isSupportedViewTypes";
import { PROJECT_ROOT } from "./utils/projectRoot";

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

  toString() {
    const data: Record<string, unknown> = {
      config: this.#config,
      callbacks: {},
    };

    for (const [callbackName, callbackValue] of Object.entries(
      this.callbacks,
    )) {
      (data.callbacks as Record<string, unknown>)[callbackName] = {
        name: callbackValue.name,
        instance: callbackValue.instance.toString(),
      };
    }

    return data;
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
      this.callbacks[cb.name] = {
        name: cb.name,
        instance: cb.instance,
      };
      logger.info(`added callback ${cb.name}`);
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

  /**
   * Render a specific playlist item by its ID (without advancing the rotation)
   */
  async renderPlaylistItemById(
    playlistItemId: string,
    viewType: SupportedViewType,
  ): Promise<RenderResponse> {
    const playlistItem = this.getPlaylistItemById(playlistItemId);

    if (!playlistItem) {
      logger.error(`playlist item not found: ${playlistItemId}`);
      return {
        error: `playlist item not found: ${playlistItemId}`,
        viewType: "error",
      };
    }

    return this.renderPlaylistItem(playlistItem, viewType);
  }

  resolveLayoutForCallback(parentLayout: string, childSlotName: string) {
    if (parentLayout === "full") {
      if (childSlotName === "content") {
        return undefined;
      }
    } else if (parentLayout === "2-col") {
      return "2-col";
    }
  }

  /**
   * Internal method to render a playlist item with all its callbacks
   */
  private async renderPlaylistItem(
    playlistItem: PlaylistItem,
    viewType: SupportedViewType,
  ): Promise<RenderResponse> {
    const layoutSlotsOutputs: Record<string, string> = {};
    for (const [layoutSlotName, cb] of Object.entries(playlistItem.callbacks)) {
      if (this.hasCallback(cb.name)) {
        const instance = this.getCallbackInstance(cb.name);

        const childLayout = this.resolveLayoutForCallback(
          playlistItem.layout,
          layoutSlotName,
        );
        const htmlForCallback = await instance?.render(
          "html",
          cb.options,
          childLayout,
        );

        if (htmlForCallback?.viewType === "html") {
          layoutSlotsOutputs[layoutSlotName] = htmlForCallback.html;
        }
      }
    }

    const layoutPath = path.join(
      PROJECT_ROOT,
      `views/layouts/${playlistItem.layout}.liquid`,
    );
    const contents = await renderLiquidFile(layoutPath, layoutSlotsOutputs);

    if (viewType === "html") {
      return {
        viewType,
        html: contents,
      };
    }

    if (isSupportedImageViewType(viewType)) {
      // Now convert the final HTML to image
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const fileName = `multi-callback-${viewType}-${timestamp}-${random}.${viewType}`;
      const screenshotPath = getImagesPath(fileName);
      const screenshot = await getScreenshotWithoutFetching({
        htmlContent: contents,
        imagePath: screenshotPath,
        viewType,
        size: {
          // TODO get size from somewhere else
          width: 1200,
          height: 825,
        },
      });

      cleanupOldImages();

      return {
        viewType,
        imagePath: screenshot.path,
      };
    }

    throw new Error(`Unsupported viewType: ${viewType}`);
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

    this.advanceCallbackIndex();

    return this.renderPlaylistItem(playlistItem, viewType);
  }

  advanceCallbackIndex() {
    this.#config.currCallbackIndex++;
    if (this.#config.currCallbackIndex + 1 > this.#config.playlist.length) {
      this.#config.currCallbackIndex = 0;
    }
    logger.debug(`currCallbackIndex is now ${this.#config.currCallbackIndex}`);
  }
}

export default StateMachine;
