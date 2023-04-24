import { Logger } from "pino";
import CallbackBase from "./base";
import * as cheerio from "cheerio";

class CallbackOnThisDay extends CallbackBase {
  constructor(logger: Logger) {
    super({ name: "onThisDay", template: "on-this-day", logger });
  }

  async getHTML() {
    const res = await fetch("https://www.britannica.com/on-this-day");

    return res.text();
  }

  async getData() {
    const html = await this.getHTML();
    const $ = await cheerio.load(html);
    const $featured = $(".otd-featured-event");

    const image = $featured.find("img").attr("src");
    const title = $featured.find(".title").text();
    const description = $featured.find(".description").text();
    const links: { url: string; title: string }[] = [];

    // TODO waiting for QR solution before enabling this
    // $featured.find(".description a").map((_, elem) => {
    //   links.push({ url: $(elem).attr("href") || "", title: $(elem).text() });
    // });

    return { title, description, links, image };
  }
}

export default CallbackOnThisDay;
