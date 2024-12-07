import getScreenshot from "../utils/getScreenshot";
import getRenderedTemplate from "../utils/getRenderedTemplate";
import {
  PossibleTemplateData,
  SupportedViewTypes,
  TemplateDataError,
} from "../types";
import { Logger } from "pino";
import logger from "../logger";

export type CallbackConstructor = {
  name: string;
  template?: string;
  inRotation?: boolean;
};

abstract class CallbackBase<TemplateData extends object = object> {
  name: string;
  template: string;
  dataFile?: string;
  inRotation: boolean;
  logger: Logger;

  constructor({ name, template, inRotation = true }: CallbackConstructor) {
    this.name = name;
    this.inRotation = inRotation;
    this.template = template || name || "generic";
    this.logger = logger;
  }

  abstract getData(): PossibleTemplateData<TemplateData>;

  async render(viewType: SupportedViewTypes) {
    this.logger.info(`rendering: ${this.name}`);

    const data = await this.getData()

    let templateOverride: string | undefined;
    
    if ('error' in data) {
      templateOverride = 'error'
    }

    if (viewType === "png") {
      return this.#renderAsPNG(data, templateOverride);
    }

    if (viewType === "html") {
      return this.#renderAsHTML(data, templateOverride);
    }

    return data;
  }

  async #renderAsPNG(data: TemplateDataError | TemplateData, template?: string): Promise<string> {
    const screenshot = await getScreenshot({
      data,
      template: template ? template : this.template,
    });

    return screenshot.path;
  }

  #renderAsHTML(data: TemplateDataError | TemplateData, template?: string) {
    return getRenderedTemplate({ template: template ? template : this.template, data });
  }
}

export default CallbackBase;
