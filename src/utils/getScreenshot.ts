import puppeteer, { LaunchOptions } from "puppeteer";
import { Jimp } from "jimp";
import getRenderedTemplate from "./getRenderedTemplate";
import { readFile } from "node:fs/promises";
import { ScreenshotSizeOption } from "../types";

async function getScreenshot<T extends object>({
  template,
  data,
  imagePath,
  viewType,
  size = {
    width: 1200,
    height: 825,
  },
}: {
  template: string;
  data: T;
  imagePath: string;
  viewType: string;
  size?: ScreenshotSizeOption;
}) {
  const puppeteerOptions: LaunchOptions = {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--unhandled-rejections=strict",
    ],
  };

  if (process.env.CHROMIUM_BIN) {
    puppeteerOptions.executablePath = process.env.CHROMIUM_BIN;
  }

  const browser = await puppeteer.launch(puppeteerOptions);
  const page = await browser.newPage();

  page.setViewport(size);

  const renderedTemplate = getRenderedTemplate({ template, data });

  await page.setContent(renderedTemplate);

  const buffer = await page.screenshot({ path: imagePath });

  await browser.close();

  if (viewType === "bmp") {
    const imageBuffer = await readFile(imagePath);
    const image = await Jimp.fromBuffer(imageBuffer, {
      "image/png": {},
    });
    await image.write(imagePath as `{string}.{string}`);
  }

  return { path: imagePath, buffer };
}

export default getScreenshot;
