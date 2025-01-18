import puppeteer, { LaunchOptions } from "puppeteer";
import getRenderedTemplate from "./getRenderedTemplate";

export type ScreenshotSizeOption = {
  width: number;
  height: number;
};

async function getScreenshot<T extends object>({
  template,
  data,
  imagePath,
  size = {
    width: 1200,
    height: 825,
  },
}: {
  template: string;
  data: T;
  imagePath: string;
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

  return { path: imagePath, buffer };
}

export default getScreenshot;
