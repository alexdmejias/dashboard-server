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

    // For layouts, we need to render all callbacks and combine them
    const callbackIds = playlistItem.callbacks.map(
      (cb, index) => `${playlistItem.id}-${cb.name}-${index}`,
    );

    // Get all callback instances for this playlist item
    const callbackInstances = callbackIds.map((id) =>
      this.getCallbackInstance(id),
    );

    // Check if all callbacks exist
    for (let i = 0; i < callbackInstances.length; i++) {
      if (!callbackInstances[i]) {
        logger.error(
          `callback not found: ${playlistItem.callbacks[i].name} (ID: ${callbackIds[i]})`,
        );
        return {
          error: `callback not found: ${playlistItem.callbacks[i].name}`,
          viewType: "error",
        };
      }
    }

    // For single callback, we need to render it and wrap in layout
    if (callbackInstances.length === 1) {
      // Render the callback and wrap it in the layout
      const firstInstance = callbackInstances[0];

      if (!firstInstance) {
        return {
          error: "Callback instance not found",

          viewType: "error",
        };
      }

      const rendered = await firstInstance.render(
        viewType,
        playlistItem.callbacks[0].options,
        playlistItem.layout,
      );

      if (rendered.viewType === "error") {
        return rendered;
      }

      // Load and render the layout template with the callback content
      try {
        const { Liquid } = await import("liquidjs");
        const fs = await import("node:fs/promises");
        const path = await import("node:path");

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

        const finalContent = await engine.parseAndRender(layoutTemplate, {
          content: rendered.viewType === "html" ? rendered.html : "",
        });

        return {
          viewType: "html" as const,
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

    // For multiple callbacks, render each and combine with layout
    try {
      const { Liquid } = await import("liquidjs");
      const fs = await import("node:fs/promises");
      const path = await import("node:path");

      // Render each callback with layout context
      const renderedCallbacks = await Promise.all(
        callbackInstances.map((instance, index) => {
          if (!instance) {
            return Promise.resolve({
              viewType: "error" as const,
              error: "Instance not found",
            });
          }
          return instance.render(
            viewType,
            playlistItem.callbacks[index].options,
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

      // Combine callback contents based on layout
      let combinedContent = "";
      if (playlistItem.layout === "2-col") {
        // Wrap each callback in a div for 2-col layout
        combinedContent = callbackContents
          .map((content) => `<div>${content}</div>`)
          .join("\n");
      } else {
        // For full layout, just use the single callback content
        combinedContent = callbackContents[0];
      }

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

      // Prepare data for blocks based on layout type
      let blockData: Record<string, string> = {};
      if (playlistItem.layout === "2-col") {
        blockData = {
          content_left: callbackContents[0] || "",
          content_right: callbackContents[1] || "",
        };
      } else {
        blockData = {
          content: combinedContent,
        };
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

    // For layouts, we need to render all callbacks and combine them
    const callbackIds = playlistItem.callbacks.map(
      (cb, index) => `${playlistItem.id}-${cb.name}-${index}`,
    );

    // Get all callback instances for this playlist item
    const callbackInstances = callbackIds.map((id) =>
      this.getCallbackInstance(id),
    );

    // Check if all callbacks exist
    for (let i = 0; i < callbackInstances.length; i++) {
      if (!callbackInstances[i]) {
        logger.error(
          `callback not found: ${playlistItem.callbacks[i].name} (ID: ${callbackIds[i]})`,
        );
        return {
          error: `callback not found: ${playlistItem.callbacks[i].name}`,
          viewType: "error",
        };
      }
    }

    this.advanceCallbackIndex();

    // For single callback, we need to render it and wrap in layout
    if (callbackInstances.length === 1) {
      // Render the callback and wrap it in the layout
      const firstInstance = callbackInstances[0];

      if (!firstInstance) {
        return {
          error: "Callback instance not found",

          viewType: "error",
        };
      }

      const rendered = await firstInstance.render(
        viewType,
        playlistItem.callbacks[0].options,
        playlistItem.layout,
      );

      if (rendered.viewType === "error") {
        return rendered;
      }

      // Load and render the layout template with the callback content
      try {
        const { Liquid } = await import("liquidjs");
        const fs = await import("node:fs/promises");
        const path = await import("node:path");

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

        const finalContent = await engine.parseAndRender(layoutTemplate, {
          content: rendered.viewType === "html" ? rendered.html : "",
        });

        return {
          viewType: "html" as const,
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

    // For multiple callbacks, render each and combine with layout
    try {
      const { Liquid } = await import("liquidjs");
      const fs = await import("node:fs/promises");
      const path = await import("node:path");

      // Render each callback with layout context
      const renderedCallbacks = await Promise.all(
        callbackInstances.map((instance, index) => {
          if (!instance) {
            return Promise.resolve({
              viewType: "error" as const,
              error: "Instance not found",
            });
          }
          return instance.render(
            viewType,
            playlistItem.callbacks[index].options,
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

      // Combine callback contents based on layout
      let combinedContent = "";
      if (playlistItem.layout === "2-col") {
        // Wrap each callback in a div for 2-col layout
        combinedContent = callbackContents
          .map((content) => `<div>${content}</div>`)
          .join("\n");
      } else {
        // For full layout, just use the single callback content
        combinedContent = callbackContents[0];
      }

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

      // Prepare data for blocks based on layout type
      let blockData: Record<string, string> = {};
      if (playlistItem.layout === "2-col") {
        blockData = {
          content_left: callbackContents[0] || "",
          content_right: callbackContents[1] || "",
        };
      } else {
        blockData = {
          content: combinedContent,
        };
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

  advanceCallbackIndex() {
    this.#config.currCallbackIndex++;
    if (this.#config.currCallbackIndex + 1 > this.#config.playlist.length) {
      this.#config.currCallbackIndex = 0;
    }
    logger.debug(`currCallbackIndex is now ${this.#config.currCallbackIndex}`);
  }
}

export default StateMachine;
