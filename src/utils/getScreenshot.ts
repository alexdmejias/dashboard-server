import { webkit } from "playwright";
import imagesPath from "./imagesPath";
import getRenderedTemplate from "./getRenderedTemplate";
import { DataFromCallback } from "../types";
import { join } from "node:path";

async function getScreenshot({
  template,
  data,
}: {
  template: string;
  data: DataFromCallback;
}) {
  const browser = await webkit.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // TODO should be params
  page.setViewportSize({
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
