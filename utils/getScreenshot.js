import imagesPath from "./imagesPath.js";
import { webkit } from "playwright";

async function getScreenshot({ url, name, data }) {
  const browser = await webkit.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  page.setViewportSize({
    width: 1200,
    height: 825,
  });

  await page.goto(url);

  const screenshotPath = imagesPath(name);

  await page.screenshot({ path: screenshotPath });
  await browser.close();

  return screenshotPath;
}

export default getScreenshot;
