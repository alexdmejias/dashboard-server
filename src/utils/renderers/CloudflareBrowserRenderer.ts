import { writeFile } from "node:fs/promises";
import type { ScreenshotSizeOption } from "../../types";
import type {
  BrowserRenderer,
  RenderOptions,
  RenderResult,
} from "../../types/browser-renderer";

export interface CloudflareConfig {
  accountId: string;
  apiToken: string;
}

class CloudflareBrowserRenderer implements BrowserRenderer {
  private accountId: string;
  private apiToken: string;
  private baseUrl: string;

  constructor(config: CloudflareConfig) {
    this.accountId = config.accountId;
    this.apiToken = config.apiToken;
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/browser-rendering/screenshot`;
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
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        html: htmlContent,
        gotoOptions: {
          waitUntil: "load",
        },
        viewport: {
          width: size.width,
          height: size.height,
        },
        screenshotOptions: {
          type: "png",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Cloudflare Browser Rendering failed: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
  }
}

export default CloudflareBrowserRenderer;
