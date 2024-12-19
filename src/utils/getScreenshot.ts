import puppeteer from "puppeteer";
import getRenderedTemplate from "./getRenderedTemplate";

export type ScreenshotSizeOption = {
  width: number;
  height: number;
};

async function getScreenshot<T>({
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
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROMIUM_BIN || undefined,
  });
  const page = await browser.newPage();

  page.setViewport(size);

  const renderedTemplate = getRenderedTemplate({ template, data });

  await page.setContent(renderedTemplate);

  const buffer = await page.screenshot({ path: imagePath });

  await browser.close();

  return { path: imagePath, buffer };
}

export default getScreenshot;
