import { webkit } from "playwright";
import imagesPath from "./imagesPath";

async function getScreenshot({ url, name}: {url: string, name: string}) {
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
