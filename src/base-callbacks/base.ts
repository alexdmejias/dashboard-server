import fs from "node:fs";
import path from "node:path";
import objectHash from "object-hash";
import type { Logger } from "pino";
import { z } from "zod/v4";
// import DB from "../db";
import logger from "../logger";
import type {
  PossibleTemplateData,
  ScreenshotSizeOption,
  SupportedImageViewType,
  SupportedViewType,
  TemplateDataError,
} from "../types";
import { getBrowserRendererType } from "../utils/getBrowserRendererType";
import getRenderedTemplate from "../utils/getRenderedTemplate";
import getScreenshot from "../utils/getScreenshot";
import { cleanupOldImages, getImagesPath } from "../utils/imagesPath";
import { isSupportedImageViewType } from "../utils/isSupportedViewTypes";

export type CallbackConstructor<ExpectedConfig extends z.ZodTypeAny> = {
  name: string;
  template?: string;
  inRotation?: boolean;
  screenshotSize?: ScreenshotSizeOption;
  cacheable?: boolean;
  envVariablesNeeded?: string[];
  receivedConfig?: unknown;
  expectedConfig?: ExpectedConfig;
};

export type RenderResponse =
  | {
      viewType: SupportedImageViewType;
      imagePath: string;
    }
  | {
      viewType: "html";
      html: string;
    }
  | {
      viewType: "json";
      json: object;
    }
  | {
      viewType: "error";
      error: string;
    };

class CallbackBase<
  TemplateData extends object = object,
  ExpectedConfig extends z.ZodObject = z.ZodObject,
> {
  // static defaults can be overridden by child classes
  static defaultOptions?: unknown;
  name: string;
  template: string;
  dataFile?: string;
  inRotation: boolean;
  logger: Logger;
  screenshotSize: ScreenshotSizeOption;
  cacheable = false;
  oldDataCache = "";
  envVariablesNeeded: string[] = [];
  receivedConfig?: unknown;
  expectedConfig?: ExpectedConfig;

  constructor({
    name,
    template,
    inRotation = false,
    screenshotSize,
    cacheable = false,
    envVariablesNeeded = [],
    receivedConfig,
    expectedConfig,
  }: CallbackConstructor<ExpectedConfig>) {
    this.name = name;
    this.inRotation = inRotation;
    this.template = this.#resolveTemplate(name, template);
    this.logger = logger;
    this.screenshotSize = screenshotSize || {
      width: 1200,
      height: 825,
    };
    this.cacheable = cacheable;
    this.envVariablesNeeded = envVariablesNeeded;
    this.expectedConfig = expectedConfig;

    // Merge defaults from the child's static defaultOptions with receivedConfig.
    const ctor = this.constructor as typeof CallbackBase & {
      defaultOptions?: unknown;
    };
    const defaults = (ctor.defaultOptions ?? {}) as unknown;

    if (expectedConfig) {
      // Use zod to validate and fill defaults
      try {
        this.receivedConfig = (
          this.constructor as typeof CallbackBase
        ).mergeWithDefaults(
          expectedConfig as any,
          defaults as any,
          receivedConfig as any,
        );
      } catch (e) {
        // rethrow to surface config validation errors during construction
        throw e;
      }
    } else {
      // shallow merge when no schema is provided
      this.receivedConfig = {
        ...(defaults as Record<string, unknown>),
        ...(typeof receivedConfig === "object" && receivedConfig
          ? (receivedConfig as Record<string, unknown>)
          : {}),
      };
    }

    if (this.envVariablesNeeded.length) {
      this.checkEnvVariables();
    }
  }

  toString() {
    const data: Record<string, any> = {
      cacheable: this.cacheable,
      screenshotSize: this.screenshotSize,
      envVariablesNeeded: this.envVariablesNeeded,
      template: this.template,
      receivedConfig: this.receivedConfig,
    };

    if (
      this.expectedConfig &&
      typeof this.expectedConfig.transform !== "function"
    ) {
      data.expectedConfig = z.toJSONSchema(this.expectedConfig);
    }
    return data;
  }

  getData(_config: any): PossibleTemplateData<TemplateData> {
    throw new Error(
      `getData method not implemented for callback: ${this.name}`,
    );
  }

  getEnvVariables(): Record<string, string | undefined> {
    return {};
  }

  checkEnvVariables() {
    const missingKeys: string[] = [];
    for (const key of this.envVariablesNeeded) {
      if (!process.env[key]) {
        missingKeys.push(key);
      }
    }

    if (missingKeys.length) {
      const message = `${
        this.name
      } callback requires the following environment variable(s): ${missingKeys.join(
        ", ",
      )}`;
      this.logger.error(message);
      throw new Error(message);
    }

    return true;
  }

  static checkRuntimeConfig(
    expectedConfig?: z.ZodTypeAny,
    receivedConfig?: unknown,
  ) {
    // this.logger.debug(
    //   { receivedConfig: this.receivedConfig },
    //   `checking runtime config for callback: ${this.name}`
    // );
    if (expectedConfig) {
      const result = expectedConfig.safeParse(receivedConfig, {
        reportInput: true,
      });
      if (!result.success) {
        throw result.error;
      }
    }
    return true;
  }

  // getRuntimeConfig() {
  //   return this.receivedConfig as z.infer<ExpectedConfig>;
  // }

  /**
   * Utility to merge default config with provided options, using zod for type safety.
   */
  static mergeWithDefaults<ConfigType extends object>(
    expectedConfig: z.ZodType,
    defaults: ConfigType,
    options?: Partial<ConfigType>,
  ): ConfigType {
    const merged = { ...defaults, ...(options || {}) };
    const result = expectedConfig.safeParse(merged);
    if (!result.success) {
      throw result.error;
    }
    return result.data as ConfigType;
  }

  // async getDBData<DBTableShape>(
  //   tableName: string,
  //   transformer?: (tableRow: DBTableShape) => TemplateData,
  // ): PossibleTemplateData<TemplateData> {
  //   try {
  //     const data = await DB.getRecord<DBTableShape>(tableName);

  //     if (!data) {
  //       throw new Error(`${this.name}: no data received`);
  //     }

  //     return transformer ? transformer(data) : (data as TemplateData);
  //   } catch (e) {
  //     return { error: e instanceof Error ? e.message : (e as string) };
  //   }
  // }

  async render(
    viewType: SupportedViewType,
    options?: unknown,
    layout?: "full" | "2-col",
  ): Promise<RenderResponse> {
    // TODO validate viewType
    this.logger.info(`rendering: ${this.name} as viewType: ${viewType}`);

    // allow callers to supply runtime options (e.g. from a playlist item).
    const runtimeConfig = this.#buildRuntimeConfig(options);
    this.logger.debug(
      { runtimeConfig, options },
      `Built runtimeConfig for ${this.name}`,
    );
    const data = await this.getData(
      runtimeConfig as unknown as Record<string, unknown>,
    );

    let templateOverride: string | undefined;

    if ("error" in data) {
      templateOverride = "error";
      return {
        viewType: "error",
        error: data.error,
      };
    }

    // Resolve layout-specific template if layout is provided
    const templateToUse = layout
      ? this.resolveLayoutTemplate(layout)
      : this.template;

    // When rendering for layouts, don't include head/footer wrapper
    const includeWrapper = !layout;

    if (isSupportedImageViewType(viewType)) {
      try {
        if (this.cacheable && templateOverride !== "error") {
          const newDataCache = objectHash(data);
          const screenshotPath = getImagesPath(
            `${this.name}-${newDataCache}.${viewType}`,
          );
          if (newDataCache === this.oldDataCache) {
            return {
              viewType,
              imagePath: screenshotPath,
            };
          }

          this.oldDataCache = newDataCache;
          return {
            viewType,
            imagePath: await this.#renderAsImage({
              viewType,
              data,
              runtimeConfig: runtimeConfig as ExpectedConfig,
              imagePath: screenshotPath,
              templateOverride,
              templateToUse,
              includeWrapper,
              clientName: this.name,
            }),
          };
        }

        // const screenshotPath = getImagesPath(`image.${viewType}`);

        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const fileName = `${this.name}-${viewType}-${timestamp}-${random}.${viewType}`;
        const screenshotPath = getImagesPath(fileName);
        return {
          viewType,
          imagePath: await this.#renderAsImage({
            viewType,
            data,
            runtimeConfig: runtimeConfig as ExpectedConfig,
            imagePath: screenshotPath,
            templateOverride,
            templateToUse,
            includeWrapper,
            clientName: this.name,
          }),
        };

        // return {
        //   viewType,
        //   imagePath: await this.#renderAsImage({
        //     viewType,
        //     data,
        //     runtimeConfig: runtimeConfig as ExpectedConfig,
        //     imagePath: screenshotPath,
        //     templateOverride,
        //     clientName: this.name,
        //   }),
        // };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          { error, callback: this.name },
          "Browser rendering failed",
        );
        return {
          viewType: "error",
          error: errorMessage,
        };
      }
    }

    if (viewType === "html") {
      // TODO should also implement a caching strategy?
      return {
        viewType,
        html: await this.#renderAsHTML({
          data,
          template: templateOverride,
          runtimeConfig: runtimeConfig as ExpectedConfig,
          templateToUse,
          includeWrapper,
        }),
      };
    }

    return { viewType, json: data };
  }

  async #renderAsImage<T extends TemplateData>({
    viewType,
    data,
    runtimeConfig,
    imagePath,
    templateOverride,
    templateToUse,
    includeWrapper = true,
    clientName,
  }: {
    viewType: SupportedImageViewType;
    data: T;
    runtimeConfig: ExpectedConfig;
    imagePath: string;
    templateOverride?: string;
    templateToUse?: string;
    includeWrapper?: boolean;
    clientName: string;
  }): Promise<string> {
    const screenshot = await getScreenshot<T>({
      data,
      runtimeConfig,
      template: templateOverride
        ? templateOverride
        : templateToUse || this.template,
      size: this.screenshotSize,
      imagePath,
      viewType,
      includeWrapper,
    });

    const rendererType = getBrowserRendererType();
    const fileName = path.basename(imagePath);

    // Log image save details
    this.logger.info(
      {
        imagePath,
        fileName,
        rendererType,
        width: this.screenshotSize.width,
        height: this.screenshotSize.height,
        viewType,
        clientName,
      },
      `Saved callback image: ${fileName}`,
    );

    // Cleanup old images if limit exceeded
    cleanupOldImages();

    return screenshot.path;
  }

  async #renderAsHTML({
    data,
    template,
    runtimeConfig,
    templateToUse,
    includeWrapper = true,
  }: {
    data: TemplateDataError | TemplateData;
    template?: string;
    runtimeConfig?: ExpectedConfig;
    templateToUse?: string;
    includeWrapper?: boolean;
  }) {
    return getRenderedTemplate({
      template: template ? template : templateToUse || this.template,
      data,
      runtimeConfig,
      includeWrapper,
    });
  }

  #buildRuntimeConfig(options?: unknown) {
    const merged =
      typeof options === "undefined"
        ? this.receivedConfig
        : this.#mergeWithReceivedConfig(options);

    if (!this.expectedConfig) {
      return merged;
    }

    return this.expectedConfig.loose().parse(merged);
  }

  #mergeWithReceivedConfig(options: unknown) {
    if (
      typeof options === "object" &&
      options !== null &&
      typeof this.receivedConfig === "object" &&
      this.receivedConfig !== null
    ) {
      return {
        ...(this.receivedConfig as Record<string, unknown>),
        ...(options as Record<string, unknown>),
      };
    }

    return options;
  }

  /**
   * Resolve a layout-specific template for this callback
   * For 2-col layout, tries to load template.2col.{ext} first
   * Falls back to the default template if layout-specific template doesn't exist
   */
  resolveLayoutTemplate(layout: "full" | "2-col"): string {
    // For 2-col layout, try to find template.2col.{ext}
    if (layout === "2-col") {
      const layoutSpecific = path.resolve(
        `./src/callbacks/${this.name}/template.2col.liquid`,
      );
      if (fs.existsSync(layoutSpecific)) {
        this.logger.info(
          `Using layout-specific template for ${this.name}: ${layoutSpecific}`,
        );
        return layoutSpecific;
      }
      this.logger.info(
        `No layout-specific template found for ${this.name} at: ${layoutSpecific}`,
      );
    }

    // For full layout or if layout-specific template doesn't exist, use default
    this.logger.info(
      `Using default template for ${this.name}: ${this.template}`,
    );
    return this.template;
  }

  #resolveTemplate(name: string, template?: string): string {
    // 1) If a specific template was requested, prefer resolving that first
    if (template) {
      // try exact resolution in callbacks folder if the template includes an ext or matches a preference
      const candidate = path.resolve(`./src/callbacks/${name}/${template}`);
      if (fs.existsSync(candidate)) return candidate;
      const viewsCandidate = path.resolve(`./views/${template}`);
      if (fs.existsSync(viewsCandidate)) return viewsCandidate;

      // try templates folder (views) with preferred extensions
      const viewsPath = path.resolve(`./views/${template}.liquid`);
      if (fs.existsSync(viewsPath)) return viewsPath;
    }

    // 2) Look for callback-local templates (template.liquid)
    const local = path.resolve(`./src/callbacks/${name}/template.liquid`);
    if (fs.existsSync(local)) return local;

    // 3) Fallback to views/{name}.{ext}
    const viewsPath = path.resolve(`./views/${name}.liquid`);
    if (fs.existsSync(viewsPath)) return viewsPath;

    throw new Error(`No valid template found for callback: ${name}`);
  }
}

export default CallbackBase;
