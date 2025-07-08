import fs from "node:fs";
import path from "node:path";
import objectHash from "object-hash";
import type { Logger } from "pino";
import { z } from "zod/v4";
import DB from "../db";
import logger from "../logger";
import type {
  PossibleTemplateData,
  ScreenshotSizeOption,
  SupportedImageViewType,
  SupportedViewType,
  TemplateDataError,
} from "../types";
import getRenderedTemplate from "../utils/getRenderedTemplate";
import getScreenshot from "../utils/getScreenshot";
import { getImagesPath } from "../utils/imagesPath";
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
  name: string;
  template: string;
  dataFile?: string;
  inRotation: boolean;
  #logger: Logger;
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
    this.#logger = logger;
    this.screenshotSize = screenshotSize || {
      width: 1200,
      height: 825,
    };
    this.cacheable = cacheable;
    this.envVariablesNeeded = envVariablesNeeded;
    this.expectedConfig = expectedConfig;
    this.receivedConfig = receivedConfig;

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

    if (this.expectedConfig) {
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
      this.#logger.error(message);
      throw new Error(message);
    }

    return true;
  }

  static checkRuntimeConfig(
    expectedConfig?: z.ZodTypeAny,
    receivedConfig?: unknown,
  ) {
    // this.#logger.debug(
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

  async getDBData<DBTableShape>(
    tableName: string,
    transformer?: (tableRow: DBTableShape) => TemplateData,
  ): PossibleTemplateData<TemplateData> {
    try {
      const data = await DB.getRecord<DBTableShape>(tableName);

      if (!data) {
        throw new Error(`${this.name}: no data received`);
      }

      return transformer ? transformer(data) : (data as TemplateData);
    } catch (e) {
      return { error: e instanceof Error ? e.message : (e as string) };
    }
  }

  async render(
    viewType: SupportedViewType,
    options?: any,
  ): Promise<RenderResponse> {
    // TODO validate viewType
    this.#logger.info(`rendering: ${this.name} as viewType: ${viewType}`);

    const data = await this.getData(options);

    let templateOverride: string | undefined;

    if ("error" in data) {
      templateOverride = "error";
      return {
        viewType: "error",
        error: data.error,
      };
    }

    if (isSupportedImageViewType(viewType)) {
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
            runtimeConfig: options,
            imagePath: screenshotPath,
            templateOverride,
          }),
        };
      }

      const screenshotPath = getImagesPath(`image.${viewType}`);
      return {
        viewType,
        imagePath: await this.#renderAsImage({
          viewType,
          data,
          imagePath: screenshotPath,
          templateOverride,
        }),
      };
    }

    if (viewType === "html") {
      // TODO should also implement a caching strategy?
      return {
        viewType,
        html: await this.#renderAsHTML({
          data,
          template: templateOverride,
          runtimeConfig: options,
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
  }: {
    viewType: SupportedImageViewType;
    data: T;
    runtimeConfig?: ExpectedConfig;
    imagePath: string;
    templateOverride?: string;
  }): Promise<string> {
    const screenshot = await getScreenshot<T>({
      data,
      runtimeConfig,
      template: templateOverride ? templateOverride : this.template,
      size: this.screenshotSize,
      imagePath,
      viewType,
    });

    return screenshot.path;
  }

  async #renderAsHTML({
    data,
    template,
    runtimeConfig,
  }: {
    data: TemplateDataError | TemplateData;
    template?: string;
    runtimeConfig?: ExpectedConfig;
  }) {
    return getRenderedTemplate({
      template: template ? template : this.template,
      data,
      runtimeConfig,
    });
  }

  #resolveTemplate(name: string, template?: string): string {
    const adjacentTemplatePath = path.resolve(
      `./src/callbacks/${name}/template.ejs`,
    );
    if (fs.existsSync(adjacentTemplatePath)) {
      return adjacentTemplatePath;
    }

    const templatesFolderPath = `./views/${template || name}.ejs`;
    if (fs.existsSync(templatesFolderPath)) {
      return templatesFolderPath;
    }

    const genericTemplatePath = "./views/generic.ejs";
    if (fs.existsSync(genericTemplatePath)) {
      return genericTemplatePath;
    }

    throw new Error(`No valid template found for callback: ${name}`);
  }
}

export default CallbackBase;
