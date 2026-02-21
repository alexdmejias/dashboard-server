import logger from "../logger";
import { getApiKey, getSettings } from "../settings";
import type { BrowserRenderer } from "../types/browser-renderer";
import BrowserlessIOBrowserRenderer from "./BrowserlessIOBrowserRenderer";
import CloudflareBrowserRenderer from "./CloudflareBrowserRenderer";
import { getBrowserRendererType } from "./getBrowserRendererType";
import PuppeteerBrowserRenderer from "./PuppeteerBrowserRenderer";
import ServiceRotator, { type ServiceConfig } from "./ServiceRotator";

export function createBrowserRenderer(): BrowserRenderer {
  const rendererType = getBrowserRendererType();
  const settings = getSettings();

  logger.info(`Creating browser renderer: ${rendererType}`);

  switch (rendererType) {
    case "cloudflare": {
      const accountId = getApiKey("CLOUDFLARE_ACCOUNT_ID");
      const apiToken = getApiKey("CLOUDFLARE_API_TOKEN");

      if (!accountId || !apiToken) {
        throw new Error(
          "Cloudflare Browser Renderer requires CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (env or settings)",
        );
      }

      return new CloudflareBrowserRenderer({
        accountId,
        apiToken,
      });
    }
    case "browserless": {
      const token = getApiKey("BROWSERLESS_IO_TOKEN");
      const endpoint = settings.browserlessEndpoint;

      if (!token || !endpoint) {
        throw new Error(
          "Browserless.io Browser Renderer requires BROWSERLESS_IO_TOKEN (env or settings) and browserlessEndpoint setting",
        );
      }

      return new BrowserlessIOBrowserRenderer({
        token,
        endpoint,
      });
    }
    case "multi": {
      const services: ServiceConfig[] = [];

      const enableCloudflare = settings.enableCloudflareBrowserRendering;
      const enableBrowserless = settings.enableBrowserlessIO;

      if (enableCloudflare) {
        const accountId = getApiKey("CLOUDFLARE_ACCOUNT_ID");
        const apiToken = getApiKey("CLOUDFLARE_API_TOKEN");

        if (accountId && apiToken) {
          services.push({
            name: "cloudflare",
            renderer: new CloudflareBrowserRenderer({
              accountId,
              apiToken,
            }),
          });
          logger.info("Cloudflare renderer enabled in multi-service mode");
        } else {
          logger.warn("Cloudflare enabled but missing credentials, skipping");
        }
      }

      if (enableBrowserless) {
        const token = getApiKey("BROWSERLESS_IO_TOKEN");
        const endpoint = settings.browserlessEndpoint;

        if (token && endpoint) {
          services.push({
            name: "browserless",
            renderer: new BrowserlessIOBrowserRenderer({
              token,
              endpoint,
            }),
          });
          logger.info("Browserless.io renderer enabled in multi-service mode");
        } else {
          logger.warn(
            "Browserless.io enabled but missing credentials, skipping",
          );
        }
      }

      if (services.length === 0) {
        logger.info(
          "No external services configured, falling back to Puppeteer",
        );
        return new PuppeteerBrowserRenderer();
      }

      logger.info(
        `Multi-service mode with ${services.length} service(s): ${services.map((s) => s.name).join(", ")}`,
      );
      return new ServiceRotator(services);
    }
    case "puppeteer":
    default:
      return new PuppeteerBrowserRenderer();
  }
}
