import { writeFile } from "node:fs/promises";
import type { ScreenshotSizeOption } from "../types";
import type {
  BrowserRenderer,
  RenderOptions,
  RenderResult,
} from "../types/browser-renderer";

export interface BrowserlessIOConfig {
  token: string;
  endpoint: string;
}

class BrowserlessIOBrowserRenderer implements BrowserRenderer {
  private token: string;
  private endpoint: string;

  constructor(config: BrowserlessIOConfig) {
    this.token = config.token;
    this.endpoint = config.endpoint;
  }

  async renderPage(options: RenderOptions): Promise<RenderResult> {
    const {
      htmlContent,
      imagePath,
      size = { width: 1200, height: 825 },
    } = options;

    const response = await this.captureScreenshot(htmlContent, size);

    // Write the screenshot buffer to the file
    await writeFile(imagePath, response);

    return {
      path: imagePath,
      buffer: response,
    };
  }

  private async captureScreenshot(
    htmlContent: string,
    size: ScreenshotSizeOption,
  ): Promise<Buffer> {
    const url = `${this.endpoint}/screenshot?token=${this.token}`;

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
