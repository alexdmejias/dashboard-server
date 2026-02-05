import { readFile } from "node:fs/promises";
import { Jimp } from "jimp";
import type { ScreenshotSizeOption } from "../types";
import { createBrowserRenderer } from "./browserRendererFactory";
import getRenderedTemplate from "./getRenderedTemplate";

async function getScreenshot<
  T extends object = object,
  U extends object = object,
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
  includeWrapper = true,
}: {
  template: string;
  data: T;
  runtimeConfig?: U;
  imagePath: string;
  viewType: string;
  size?: ScreenshotSizeOption;
  includeWrapper?: boolean;
}) {
  const renderedTemplate = await getRenderedTemplate({
    template,
    data,
    runtimeConfig,
    includeWrapper,
  });

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
    return { path: imagePath, buffer: image.getBuffer("image/bmp") };
  }

  return { path: imagePath, buffer };
}

export default getScreenshot;
