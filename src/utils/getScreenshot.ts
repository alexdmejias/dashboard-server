import { Jimp } from "jimp";
import getRenderedTemplate from "./getRenderedTemplate";
import { readFile } from "node:fs/promises";
import { ScreenshotSizeOption } from "../types";
import { createBrowserRenderer } from "./browserRendererFactory";

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
  const renderedTemplate = getRenderedTemplate({ template, data });

  const renderer = createBrowserRenderer();
  const { buffer } = await renderer.renderPage({
    htmlContent: renderedTemplate,
    imagePath,
    size,
  });

  if (viewType === "bmp") {
    const imageBuffer = await readFile(imagePath);
    const image = await Jimp.read(imageBuffer);

    await image.write(imagePath as `{string}.{string}`);
    return { path: imagePath, buffer: image.getBuffer(`image/bmp`) };
  }

  return { path: imagePath, buffer };
}

export default getScreenshot;
