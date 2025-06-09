import getScreenshot from "../utils/getScreenshot";
import getRenderedTemplate from "../utils/getRenderedTemplate";
import {
  PossibleTemplateData,
  SupportedViewType,
  TemplateDataError,
  SupportedImageViewType,
  ScreenshotSizeOption,
} from "../types";
import { Logger } from "pino";
import logger from "../logger";
import objectHash from "object-hash";
import { getImagesPath } from "../utils/imagesPath";
import { isSupportedImageViewType } from "../utils/isSupportedViewTypes";
import { z } from "zod/v4";
import fs from "fs";

import DB from "../db";
import path from "path";

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
      error: TemplateDataError;
    };

class CallbackBase<
  TemplateData extends object = object,
  ExpectedConfig extends z.ZodObject = z.ZodObject
> {
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
    this.receivedConfig = receivedConfig;

    if (this.envVariablesNeeded.length) {
      this.checkEnvVariables();
    }
    this.checkRuntimeConfig();
  }

  getData(): PossibleTemplateData<TemplateData> {
    throw new Error(
      `getData method not implemented for callback: ${this.name}`
    );
  }

  getEnvVariables(): Record<string, string | undefined> {
    return {};
  }

  checkEnvVariables() {
    const missingKeys: string[] = [];
    this.envVariablesNeeded.forEach((key) => {
      if (!process.env[key]) {
        missingKeys.push(key);
      }
    });

    if (missingKeys.length) {
      const message = `${
        this.name
      } callback requires the following environment variable(s): ${missingKeys.join(
        ", "
      )}`;
      this.logger.error(message);
      throw new Error(message);
    }

    return true;
  }

  checkRuntimeConfig() {
    if (this.expectedConfig) {
      try {
        this.logger.debug(
          `received runtime config for ${this.name}: ${JSON.stringify(
            this.receivedConfig
          )}`
        );

        const result = this.expectedConfig.safeParse(this.receivedConfig);
        if (!result.success) {
          throw new Error(result.error.message);
        }
      } catch (error) {
        this.logger.error(
          `Error checking runtime config for callback: ${this.name}`,
          error
        );
        throw error;
      }
    }
    return true;
  }

  getRuntimeConfig() {
    return this.receivedConfig as z.infer<ExpectedConfig>;
  }

  async getDBData<DBTableShape>(
    tableName: string,
    transformer?: (tableRow: DBTableShape) => TemplateData
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

  async render(viewType: SupportedViewType): Promise<RenderResponse> {
    // TODO validate viewType
    this.logger.info(`rendering: ${this.name} as viewType: ${viewType}`);

    const data = await this.getData();

    let templateOverride: string | undefined;

    if ("error" in data) {
      templateOverride = "error";
    }

    if (isSupportedImageViewType(viewType)) {
      if (this.cacheable && templateOverride !== "error") {
        const newDataCache = objectHash(data);
        const screenshotPath = getImagesPath(
          `${this.name}-${newDataCache}.${viewType}`
        );
        if (newDataCache === this.oldDataCache) {
          return {
            viewType,
            imagePath: screenshotPath,
          };
        } else {
          this.oldDataCache = newDataCache;
          return {
            viewType,
            imagePath: await this.#renderAsImage({
              viewType,
              data,
              runtimeConfig: this.getRuntimeConfig(),
              imagePath: screenshotPath,
              templateOverride,
            }),
          };
        }
      } else {
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
    }

    if (viewType === "html") {
      // TODO should also implement a caching strategy?
      return {
        viewType,
        html: await this.#renderAsHTML(data, templateOverride),
      };
    }

    return { viewType, json: data };
  }

  async #renderAsImage<T extends PossibleTemplateData<TemplateData>>({
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

  async #renderAsHTML(
    data: TemplateDataError | TemplateData,
    template?: string
  ) {
    return await getRenderedTemplate({
      template: template ? template : this.template,
      data,
      runtimeConfig: this.getRuntimeConfig(),
    });
  }

  #resolveTemplate(name: string, template?: string): string {
    const adjacentTemplatePath = path.resolve(
      `./src/callbacks/${name}/template.ejs`
    );
    if (fs.existsSync(adjacentTemplatePath)) {
      return adjacentTemplatePath;
    }

    const templatesFolderPath = `./views/${template || name}.ejs`;
    if (fs.existsSync(templatesFolderPath)) {
      return templatesFolderPath;
    }

    const genericTemplatePath = `./views/generic.ejs`;
    if (fs.existsSync(genericTemplatePath)) {
      return genericTemplatePath;
    }

    throw new Error(`No valid template found for callback: ${name}`);
  }
}

export default CallbackBase;
