import { BrowserRendererType } from "../types";

export function getBrowserRendererType(): BrowserRendererType {
  const renderer = process.env.BROWSER_RENDERER || "puppeteer";
  
  // Validate that the renderer type is valid
  const validTypes: BrowserRendererType[] = ["cloudflare", "puppeteer", "browserless", "multi"];
  if (!validTypes.includes(renderer as BrowserRendererType)) {
    return "puppeteer";
  }
  
  return renderer as BrowserRendererType;
}
