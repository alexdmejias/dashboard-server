import { BrowserRenderer, RenderOptions, RenderResult } from "../types/browser-renderer";

class PuppeteerBrowserRenderer implements BrowserRenderer {
  async renderPage(options: RenderOptions): Promise<RenderResult> {
    const { htmlContent, imagePath, size = { width: 1200, height: 825 } } = options;

    let puppeteer;
    try {
      puppeteer = await import("puppeteer");
    } catch (error) {
      throw new Error(
        "Puppeteer is not installed. Install it with 'npm install puppeteer' or use a different renderer like 'cloudflare'."
      );
    }

    const puppeteerOptions: any = {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--unhandled-rejections=strict",
      ],
    };

    if (process.env.CHROMIUM_BIN) {
      puppeteerOptions.executablePath = process.env.CHROMIUM_BIN;
    }

    const browser = await puppeteer.default.launch(puppeteerOptions);
    const page = await browser.newPage();

    page.setViewport(size);

    await page.setContent(htmlContent);

    const buffer = await page.screenshot({ path: imagePath });

    await browser.close();

    return {
      path: imagePath,
      buffer: buffer as Buffer,
    };
  }
}

export default PuppeteerBrowserRenderer;
