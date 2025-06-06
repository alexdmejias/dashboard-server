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
import { z } from "zod";

// export type ExpectedConfig = z.AnyZodObject;

export type CallbackConstructor<ExpectedConfig extends z.AnyZodObject> = {
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
  ExpectedConfig extends z.AnyZodObject = z.AnyZodObject
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
    inRotation = true,
    screenshotSize,
    cacheable = false,
    envVariablesNeeded = [],
    receivedConfig,
    expectedConfig,
  }: CallbackConstructor<ExpectedConfig>) {
    this.name = name;
    this.inRotation = inRotation;
    this.template = template || name || "generic";
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

  abstract getData(): PossibleTemplateData<TemplateData>;

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
      return this.expectedConfig.parse(this.receivedConfig) as ExpectedConfig;
    }

    return false;
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
        html: this.#renderAsHTML(data, templateOverride),
      };
    }

    return { viewType, json: data };
  }

  async #renderAsImage({
    viewType,
    data,
    imagePath,
    templateOverride,
  }: {
    viewType: SupportedImageViewType;
    data: TemplateDataError | TemplateData;
    imagePath: string;
    templateOverride?: string;
  }): Promise<string> {
    const screenshot = await getScreenshot({
      data,
      template: templateOverride ? templateOverride : this.template,
      size: this.screenshotSize,
      imagePath,
      viewType,
    });

    return screenshot.path;
  }

  #renderAsHTML(data: TemplateDataError | TemplateData, template?: string) {
    return getRenderedTemplate({
      template: template ? template : this.template,
      data,
    });
  }
}

export default CallbackBase;
