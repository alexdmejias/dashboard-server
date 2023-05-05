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

abstract class CallbackBase<TemplateData = any> {
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

    const data = await this.getData();

    if (viewType === "png") {
      return this.#renderAsPNG(data);
    }

    if (viewType === "html") {
      return this.#renderAsHTML(data);
    }

    return data;
  }

  async #renderAsPNG(data: TemplateDataError | Awaited<TemplateData>) {
    const screenshot = await getScreenshot({
      data,
      template: this.template,
    });

    return screenshot.path;
  }

  #renderAsHTML(data: TemplateDataError | Awaited<TemplateData>) {
    return getRenderedTemplate({ template: this.template, data });
  }
}

export default CallbackBase;
