import { BrowserRenderer, BrowserRendererType } from "../types/browser-renderer";
import CloudflareBrowserRenderer from "./CloudflareBrowserRenderer";
import PuppeteerBrowserRenderer from "./PuppeteerBrowserRenderer";
import logger from "../logger";

export function createBrowserRenderer(): BrowserRenderer {
  const rendererType = (process.env.BROWSER_RENDERER || "puppeteer") as BrowserRendererType;

  logger.info(`Creating browser renderer: ${rendererType}`);

  switch (rendererType) {
    case "cloudflare": {
      const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
      const apiToken = process.env.CLOUDFLARE_API_TOKEN;

      if (!accountId || !apiToken) {
        throw new Error(
          "Cloudflare Browser Renderer requires CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN environment variables"
        );
      }

      return new CloudflareBrowserRenderer({
        accountId,
        apiToken,
      });
    }
    case "puppeteer":
    default:
      return new PuppeteerBrowserRenderer();
  }
}
