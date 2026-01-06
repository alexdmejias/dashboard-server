import { BrowserRendererType } from "../types";

export function getBrowserRendererType(): BrowserRendererType {
  return (process.env.BROWSER_RENDERER || "puppeteer") as BrowserRendererType;
}
