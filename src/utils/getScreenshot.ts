import { webkit } from "playwright";
import imagesPath from "./imagesPath";
import getRenderedTemplate from "./getRenderedTemplate";
import { DataFromCallback } from "../types";

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

  const screenshotPath = imagesPath(template);
  const buffer = await page.screenshot({ path: screenshotPath });

  await browser.close();

  return { path: `/public/images/${template}.png`, buffer };
}

export default getScreenshot;
