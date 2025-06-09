import puppeteer, { LaunchOptions } from "puppeteer";
import { Jimp } from "jimp";
import getRenderedTemplate from "./getRenderedTemplate";
import { readFile } from "node:fs/promises";
import { PossibleTemplateData, ScreenshotSizeOption } from "../types";
import logger from "../logger";

async function getScreenshot<
  T extends PossibleTemplateData,
  U extends object = object
>({
  template,
  data,
  runtimeConfig,
  imagePath,
  viewType,
  size = {
    width: 1200,
    height: 825,
  },
}: {
  template: string;
  data: T;
  runtimeConfig?: U;
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

  logger.debug(
    `Getting rendered template for screenshot, ${JSON.stringify({
      template,
      data,
      runtimeConfig,
    })}`
  );
  const renderedTemplate = await getRenderedTemplate({
    template,
    data,
    runtimeConfig,
  });

  await page.setContent(renderedTemplate);

  const buffer = await page.screenshot({ path: imagePath });

  await browser.close();

  if (viewType === "bmp") {
    const imageBuffer = await readFile(imagePath);
    const image = await Jimp.read(imageBuffer);

    await image.write(imagePath as `{string}.{string}`);
    return { path: imagePath, buffer: image.getBuffer(`image/bmp`) };
  }

  return { path: imagePath, buffer };
}

export default getScreenshot;
