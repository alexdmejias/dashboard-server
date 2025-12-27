import { ScreenshotSizeOption } from "./index";

export interface RenderOptions {
  htmlContent: string;
  imagePath: string;
  size?: ScreenshotSizeOption;
}

export interface RenderResult {
  path: string;
  buffer: Buffer;
}

export interface BrowserRenderer {
  renderPage(options: RenderOptions): Promise<RenderResult>;
}

export type BrowserRendererType = "cloudflare" | "puppeteer";
