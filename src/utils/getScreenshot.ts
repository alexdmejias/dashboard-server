import puppeteer from "puppeteer";
import imagesPath from "./imagesPath";
import getRenderedTemplate from "./getRenderedTemplate";
import { join } from "node:path";

async function getScreenshot<T>({
  template,
  data,
}: {
  template: string;
  data: T;
}) {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROMIUM_BIN || undefined,
  });
  const page = await browser.newPage();

  // TODO should be params
  page.setViewport({
    width: 1200,
    height: 825,
  });

  const renderedTemplate = getRenderedTemplate({ template, data });

  await page.setContent(renderedTemplate);

  const screenshotPath = imagesPath();
  const path = join(__dirname, "../../", screenshotPath);
  const buffer = await page.screenshot({ path });

  await browser.close();

  return { path: screenshotPath, buffer };
}

export default getScreenshot;
