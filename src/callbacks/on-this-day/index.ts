import CallbackBase from "../../base-callbacks/base";
import * as cheerio from "cheerio";

type Link = { url: string; title: string };

type OnThisDayData = {
  title: string;
  description: string;
  image?: string;
  links: Link[];
};

class CallbackOnThisDay extends CallbackBase<OnThisDayData> {
  constructor() {
    super({ name: "onThisDay", template: "on-this-day", cacheable: true });
  }

  async getHTML() {
    const res = await fetch("https://www.britannica.com/on-this-day");

    return res.text();
  }

  async getData() {
    try {
      const html = await this.getHTML();
      const $ = await cheerio.load(html);
      const $featured = $(".otd-featured-event");

      const image = $featured.find("img").attr("src");
      const title = $featured.find(".title").text();
      const description = $featured.find(".description").text();
      const links: Link[] = [];

      // TODO waiting for QR solution before enabling this
      // $featured.find(".description a").map((_, elem) => {
      //   links.push({ url: $(elem).attr("href") || "", title: $(elem).text() });
      // });

      return { title, description, links, image };
    } catch (e) {
      return { error: e instanceof Error ? e.message : (e as string) };
    }
  }
}

export default CallbackOnThisDay;
