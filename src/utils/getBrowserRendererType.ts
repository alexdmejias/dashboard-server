import { getSettings } from "../settings";
import { BrowserRendererType } from "../types";

export function getBrowserRendererType(): BrowserRendererType {
  const renderer = getSettings().browserRenderer;

  const validTypes: BrowserRendererType[] = [
    "cloudflare",
    "puppeteer",
    "browserless",
    "multi",
  ];
  if (!validTypes.includes(renderer as BrowserRendererType)) {
    return "puppeteer";
  }

  return renderer as BrowserRendererType;
}
