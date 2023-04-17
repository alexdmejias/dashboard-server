import getScreenshot from "../utils/getScreenshot";
import getRenderedTemplate from "../utils/getRenderedTemplate";
import { DataFromCallback, SupportedViewTypes } from "../types";

abstract class CallbackBase {
  name: string;
  template: string;
  callbackUrl: string;
  inRotation: boolean;

  constructor(name: string, template?: string) {
    this.name = name;
    this.callbackUrl = `http://localhost:3000/callbacks/${name}`;
    this.inRotation = true;
    this.template = template || name;
  }

  abstract getData(): Promise<DataFromCallback>;

  async render(viewType: SupportedViewTypes) {
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
    console.log("$$$$$$$$", a);
    return a;
  }
}

export default CallbackBase;
