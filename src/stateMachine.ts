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

  toString() {
    const data: Record<string, any> = {
      config: this.#config,
      callbacks: {},
    };

    for (const [callbackName, callbackValue] of Object.entries(
      this.callbacks,
    )) {
      data.callbacks[callbackName] = {
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

  async tick(viewType: SupportedViewType): Promise<RenderResponse> {
    const playlistItem = this.#config.playlist[this.#config.currCallbackIndex];

    if (!playlistItem) {
      logger.error("no playlist item found for current index");
      return {
        error: "no playlist item found for current index",
        viewType: "error",
      };
    }

    // For layouts, we need to render all callbacks and combine them
    const callbackIds = playlistItem.callbacks.map(
      (cb, index) => `${playlistItem.id}-${cb.name}-${index}`
    );

    // Get all callback instances for this playlist item
    const callbackInstances = callbackIds.map((id) =>
      this.getCallbackInstance(id)
    );

    // Check if all callbacks exist
    for (let i = 0; i < callbackInstances.length; i++) {
      if (!callbackInstances[i]) {
        logger.error(
          `callback not found: ${playlistItem.callbacks[i].name} (ID: ${callbackIds[i]})`
        );
        return {
          error: `callback not found: ${playlistItem.callbacks[i].name}`,
          viewType: "error",
        };
      }
    }

    this.advanceCallbackIndex();

    // For viewType !== html, we can only render single callbacks
    if (viewType !== "html" && callbackInstances.length > 1) {
      logger.error("Non-HTML view types only support single callbacks");
      return {
        error: "Non-HTML view types only support single callbacks",
        viewType: "error",
      };
    }

    // For single callback, render directly
    if (callbackInstances.length === 1) {
      return callbackInstances[0]!.render(viewType, playlistItem.callbacks[0].options);
    }

    // For multiple callbacks, render each and combine with layout
    try {
      const { Liquid } = await import("liquidjs");
      const fs = await import("node:fs/promises");
      const path = await import("node:path");

      // Render each callback as HTML
      const renderedCallbacks = await Promise.all(
        callbackInstances.map((instance, index) =>
          instance!.render("html", playlistItem.callbacks[index].options)
        )
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

      // Combine callback contents based on layout
      let combinedContent = "";
      if (playlistItem.layout === "split") {
        // Wrap each callback in a div for split layout
        combinedContent = callbackContents
          .map((content) => `<div>${content}</div>`)
          .join("\n");
      } else {
        // For full layout, just use the single callback content
        combinedContent = callbackContents[0];
      }

      // Load and render the layout template
      const layoutPath = path.resolve(
        `./views/layouts/${playlistItem.layout}.liquid`
      );
      const layoutTemplate = await fs.readFile(layoutPath, "utf-8");

      const engine = new Liquid();
      const finalHtml = await engine.parseAndRender(layoutTemplate, {
        content: combinedContent,
      });

      return {
        viewType: "html",
        html: finalHtml,
      };
    } catch (error) {
      logger.error({ error }, "Error rendering layout");
      return {
        error: error instanceof Error ? error.message : String(error),
        viewType: "error",
      };
    }
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
