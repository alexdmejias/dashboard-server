import { BrowserRenderer, RenderOptions, RenderResult } from "../types/browser-renderer";
import { ScreenshotSizeOption } from "../types";
import { writeFile } from "node:fs/promises";

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
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/browser`;
  }

  async renderPage(options: RenderOptions): Promise<RenderResult> {
    const { htmlContent, imagePath, size = { width: 1200, height: 825 } } = options;

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
    size: ScreenshotSizeOption
  ): Promise<Buffer> {
    const url = `${this.baseUrl}/rendering`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: `data:text/html;base64,${Buffer.from(htmlContent).toString("base64")}`,
        options: {
          viewport: {
            width: size.width,
            height: size.height,
          },
          screenshot: {
            fullPage: false,
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Cloudflare Browser Rendering failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
  }
}

export default CloudflareBrowserRenderer;
