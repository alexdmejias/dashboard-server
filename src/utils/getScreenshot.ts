import { webkit } from "playwright";
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
