import { writeFile } from "node:fs/promises";
import type { ScreenshotSizeOption } from "../../types";
import type {
  BrowserRenderer,
  RenderOptions,
  RenderResult,
} from "../../types/browser-renderer";
import logger from "../../logger";

export interface BrowserlessIOConfig {
  token: string;
}

class BrowserlessIOBrowserRenderer implements BrowserRenderer {
  private token: string;

  constructor(config: BrowserlessIOConfig) {
    this.token = config.token;
  }

  async renderPage(options: RenderOptions): Promise<RenderResult> {
    const {
      htmlContent,
      imagePath,
      size = { width: 1200, height: 825 },
    } = options;

    const startTime = Date.now();
    logger.debug(
      { size, htmlLength: htmlContent.length },
      "BrowserlessIOBrowserRenderer: Starting screenshot capture",
    );

    const response = await this.captureScreenshot(htmlContent, size);

    // Write the screenshot buffer to the file
    await writeFile(imagePath, response);

    const duration = Date.now() - startTime;
    logger.info(
      { imagePath, size, duration, bufferSize: response.length },
      "BrowserlessIOBrowserRenderer: Screenshot captured successfully",
    );

    return {
      path: imagePath,
      buffer: response,
    };
  }

  private async captureScreenshot(
    htmlContent: string,
    size: ScreenshotSizeOption,
  ): Promise<Buffer> {
    const url = `https://production-sfo.browserless.io/screenshot?token=${this.token}`;
    
    // Get waitUntil strategy from environment variable or use networkidle2 as default
    // networkidle2 waits until there are no more than 2 network connections for at least 500ms
    // This ensures dynamic content and resources loaded by JavaScript are fully loaded
    const waitUntil = process.env.BROWSER_WAIT_UNTIL || "networkidle2";

    logger.debug(
      { waitUntil, size },
      "BrowserlessIOBrowserRenderer: Sending screenshot request to Browserless.io API",
    );

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify({
        html: htmlContent,
        options: {
          fullPage: false,
          type: "png",
          gotoOptions: {
            waitUntil,
          },
        },
        viewport: {
          width: size.width,
          height: size.height,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Browserless.io rendering failed: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
  }
}

export default BrowserlessIOBrowserRenderer;
