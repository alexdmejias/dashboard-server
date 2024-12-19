import getScreenshot, { ScreenshotSizeOption } from "../utils/getScreenshot";
import getRenderedTemplate from "../utils/getRenderedTemplate";
import {
  PossibleTemplateData,
  SupportedViewTypes,
  TemplateDataError,
} from "../types";
import { Logger } from "pino";
import logger from "../logger";
import objectHash from "object-hash";
import { getImagesPath } from "../utils/imagesPath";

export type CallbackConstructor = {
  name: string;
  template?: string;
  inRotation?: boolean;
  screenshotSize?: ScreenshotSizeOption;
  cacheable?: boolean;
  envVariablesNeeded?: string[];
};

abstract class CallbackBase<TemplateData extends object = object> {
  name: string;
  template: string;
  dataFile?: string;
  inRotation: boolean;
  logger: Logger;
  screenshotSize: ScreenshotSizeOption;
  cacheable = false;
  oldDataCache = "";
  envVariablesNeeded: string[] = [];

  constructor({
    name,
    template,
    inRotation = true,
    screenshotSize,
    cacheable = false,
    envVariablesNeeded = [],
  }: CallbackConstructor) {
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

    this.checkEnvVariables();
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

  async render(viewType: SupportedViewTypes) {
    this.logger.info(`rendering: ${this.name}`);

    const data = await this.getData();

    let templateOverride: string | undefined;

    if ("error" in data) {
      templateOverride = "error";
    }

    if (viewType === "png") {
      if (this.cacheable && templateOverride !== "error") {
        const newDataCache = objectHash(data);
        const screenshotPath = getImagesPath(
          `${this.name}-${newDataCache}.png`
        );
        if (newDataCache === this.oldDataCache) {
          return screenshotPath;
        } else {
          this.oldDataCache = newDataCache;
          return this.#renderAsPNG(data, screenshotPath, templateOverride);
        }
      } else {
        const screenshotPath = getImagesPath();
        return this.#renderAsPNG(data, screenshotPath, templateOverride);
      }
    }

    if (viewType === "html") {
      // TODO should also implement a caching strategy?
      return this.#renderAsHTML(data, templateOverride);
    }

    return data;
  }

  async #renderAsPNG(
    data: TemplateDataError | TemplateData,
    imagePath: string,
    template?: string
  ): Promise<string> {
    const screenshot = await getScreenshot({
      data,
      template: template ? template : this.template,
      size: this.screenshotSize,
      imagePath,
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
