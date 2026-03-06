import { readFile } from "node:fs/promises";
import { Jimp } from "jimp";
import type { ScreenshotSizeOption } from "../types";
import { createBrowserRenderer } from "./renderers/browserRendererFactory";

export async function getScreenshotWithoutFetching({
  htmlContent,
  imagePath,
  size,
  viewType,
}: {
  htmlContent: string;
  imagePath: string;
  viewType: string;
  size?: ScreenshotSizeOption;
}) {
  const renderer = createBrowserRenderer();
  const { buffer } = await renderer.renderPage({
    htmlContent,
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
