import { webkit } from "playwright";
import imagesPath from "./imagesPath";
import getRenderedTemplate from "./getRenderedTemplate";

async function getScreenshot({
  template,
  data,
}: {
  template: string;
  data: Record<string, any> | any[];
}) {
  const browser = await webkit.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  page.setViewportSize({
    width: 1200,
    height: 825,
  });

  const renderedTemplate = getRenderedTemplate({ template, data });

  await page.setContent(renderedTemplate);

  const screenshotPath = imagesPath(template);

  await page.screenshot({ path: screenshotPath });
  await browser.close();

  return `/public/images/${template}.png`;
}

export default getScreenshot;
