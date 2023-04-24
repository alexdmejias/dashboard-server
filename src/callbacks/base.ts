import { readFile } from "node:fs/promises";
import { join } from "path";
import getScreenshot from "../utils/getScreenshot";
import getRenderedTemplate from "../utils/getRenderedTemplate";
import { DataFromCallback, SupportedViewTypes } from "../types";
import { Logger } from "pino";

export type CallbackConstructor = {
  name: string;
  template?: string;
  dataFile?: string;
  inRotation?: boolean;
  logger: Logger;
};

abstract class CallbackBase {
  name: string;
  template: string;
  dataFile?: string;
  inRotation: boolean;
  logger: Logger;

  constructor({
    name,
    template,
    dataFile,
    inRotation = true,
    logger,
  }: CallbackConstructor) {
    this.name = name;
    this.inRotation = inRotation;
    this.template = template || name;
    this.dataFile = dataFile;
    this.logger = logger;
  }

  abstract getData(): Promise<DataFromCallback>;

  async readDataFile() {
    if (this.dataFile) {
      const filePath = join(
        __dirname,
        "../",
        "..",
        `data/${this.dataFile}.json`
      );

      const fileData = await readFile(filePath, "utf-8");

      return JSON.parse(fileData);
    }
  }

  async getItemFromFile<T>(index?: number) {
    try {
      const data = await this.readDataFile();

      if (!data) {
        throw new Error("could not read data file");
      }

      const itemNumber = Math.floor(Math.random() * data.length);

      return {
        index: itemNumber,
        item: data[itemNumber] as T,
      };
    } catch (e) {
      return {
        error: "could not get item",
      };
    }
  }

  async render(viewType: SupportedViewTypes) {
    this.logger.warn(`rendering: ${this.name}`);

    const lastUpdated = Date.now();
    const data = await this.getData();

    if (viewType === "png") {
      return this.#renderAsPNG(data);
    }

    if (viewType === "html") {
      return this.#renderAsHTML(data);
    }

    return data;
  }

  async #renderAsPNG(data: DataFromCallback) {
    const screenshot = await getScreenshot({
      data: data,
      template: this.template,
    });

    return screenshot.path;
  }

  #renderAsHTML(data: DataFromCallback) {
    const a = getRenderedTemplate({ template: this.template, data });

    return a;
  }
}

export default CallbackBase;
