import type CallbackBase from "./base-callbacks/base";
import type { RenderResponse } from "./base-callbacks/base";
import logger from "./logger";
import type {
  Playlist,
  PlaylistItem,
  SupportedViewType,
  ValidCallback,
} from "./types";
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

  /**
   * Internal method to render a playlist item with all its callbacks
   */
  private async renderPlaylistItem(
    playlistItem: PlaylistItem,
    viewType: SupportedViewType,
  ): Promise<RenderResponse> {
    // For layouts, we need to render all callbacks and combine them
    // callbacks is now an object with named slots
    const callbackEntries = Object.entries(playlistItem.callbacks) as [
      string,
      { name: string; options?: any },
    ][];

    const callbackData: Array<{
      slotName: string;
      callbackConfig: { name: string; options?: any };
      instance: CallbackBase;
      id: string;
    }> = [];

    // Get all callback instances for this playlist item
    for (const [slotName, callbackConfig] of callbackEntries) {
      const callbackId = `${playlistItem.id}-${slotName}`;
      const instance = this.getCallbackInstance(callbackId);

      if (!instance) {
        logger.error(
          `callback not found: ${callbackConfig.name} in slot ${slotName} (ID: ${callbackId})`,
        );
        return {
          error: `callback not found: ${callbackConfig.name} in slot ${slotName}`,
          viewType: "error",
        };
      }

      callbackData.push({
        slotName,
        callbackConfig,
        instance,
        id: callbackId,
      });
    }

    // For single callback, render it with layout context
    if (callbackData.length === 1) {
      const rendered = await callbackData[0].instance.render(
        viewType,
        callbackData[0].callbackConfig.options,
        playlistItem.layout,
      );

      if (rendered.viewType === "error") {
        return rendered;
      }

      // For non-HTML viewTypes, return as-is (callback now includes layout)
      if (viewType !== "html") {
        return rendered;
      }

      // For HTML, wrap in the layout template
      // TypeScript guard: at this point we know rendered should have html property
      if (rendered.viewType !== "html") {
        logger.error("Expected HTML render response but got different type");
        return {
          viewType: "error",
          error: "Expected HTML render response",
        };
      }

      try {
        const { Liquid } = await import("liquidjs");
        const fs = await import("node:fs/promises");
        const path = await import("node:path");

        const layoutPath = path.join(
          PROJECT_ROOT,
          `views/layouts/${playlistItem.layout}.liquid`,
        );
        const layoutTemplate = await fs.readFile(layoutPath, "utf-8");

        const engine = new Liquid({
          root: path.join(PROJECT_ROOT, "views/layouts"),
          partials: path.join(PROJECT_ROOT, "views/partials"),
          extname: ".liquid",
        });

        // Use the slot name as the variable name
        const blockData: Record<string, string> = {
          [callbackData[0].slotName]: rendered.html,
        };

        const finalContent = await engine.parseAndRender(
          layoutTemplate,
          blockData,
        );

        return {
          viewType: "html",
          html: finalContent,
        };
      } catch (error) {
        logger.error({ error }, "Error rendering layout for single callback");
        return {
          error: error instanceof Error ? error.message : String(error),
          viewType: "error",
        };
      }
    }

    // Multiple callbacks only supported for HTML viewType
    // if (viewType !== "html") {
    //   logger.error("Non-HTML view types only support single callbacks");
    //   return {
    //     error: "Non-HTML view types only support single callbacks",
    //     viewType: "error",
    //   };
    // }

    // For multiple callbacks, render each and combine with layout
    try {
      const { Liquid } = await import("liquidjs");
      const fs = await import("node:fs/promises");
      const path = await import("node:path");

      // Render each callback
      const renderedCallbacks = await Promise.all(
        callbackData.map((data) => {
          return data.instance.render(
            viewType,
            data.callbackConfig.options,
            playlistItem.layout,
          );
        }),
      );

      // Check for errors
      for (const rendered of renderedCallbacks) {
        if (rendered.viewType === "error") {
          return rendered;
        }
      }

      // Extract HTML content from each callback (remove head/footer)
      const extractContent = (html: string): string => {
        // Extract content between <div class="view view--full"> and title_bar
        const viewStart = html.indexOf('<div class="view view--full">');
        const titleBarStart = html.indexOf('<div class="title_bar">');

        if (viewStart === -1 || titleBarStart === -1) {
          // Fallback: return the whole HTML
          return html;
        }

        const contentStart = viewStart + '<div class="view view--full">'.length;
        const content = html.substring(contentStart, titleBarStart).trim();
        return content;
      };

      const callbackContents = renderedCallbacks.map((rendered) => {
        if (rendered.viewType === "html") {
          return extractContent(rendered.html);
        }
        return "";
      });

      // Load and render the layout template
      const layoutPath = path.join(
        PROJECT_ROOT,
        `views/layouts/${playlistItem.layout}.liquid`,
      );
      const layoutTemplate = await fs.readFile(layoutPath, "utf-8");

      // Configure liquidjs with proper paths for partials
      const engine = new Liquid({
        root: path.join(PROJECT_ROOT, "views/layouts"),
        partials: path.join(PROJECT_ROOT, "views/partials"),
        extname: ".liquid",
      });

      // Prepare data for blocks based on named slots
      const blockData: Record<string, string> = {};

      // Map each callback content to its slot name
      for (let i = 0; i < callbackData.length; i++) {
        blockData[callbackData[i].slotName] = callbackContents[i] || "";
      }

      const finalContent = await engine.parseAndRender(
        layoutTemplate,
        blockData,
      );

      return {
        viewType: "html" as const,
        html: finalContent,
      };
    } catch (error) {
      logger.error({ error }, "Error rendering layout");
      return {
        error: error instanceof Error ? error.message : String(error),
        viewType: "error",
      };
    }
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
