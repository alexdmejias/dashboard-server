import type {
  BrowserRenderer,
  RenderOptions,
  RenderResult,
} from "../../types/browser-renderer";
import logger from "../../logger";

class PuppeteerBrowserRenderer implements BrowserRenderer {
  async renderPage(options: RenderOptions): Promise<RenderResult> {
    const {
      htmlContent,
      imagePath,
      size = { width: 1200, height: 825 },
    } = options;

    const startTime = Date.now();
    logger.debug(
      { size, htmlLength: htmlContent.length },
      "PuppeteerBrowserRenderer: Starting screenshot capture",
    );

    let puppeteer: any;
    try {
      // Dynamic import to handle optional dependency
      // Using a variable prevents TypeScript from resolving the module at compile time
      const puppeteerModule = "puppeteer";
      puppeteer = await import(puppeteerModule);
    } catch (error) {
      throw new Error(
        "Puppeteer is not installed. Install it with 'npm install puppeteer' or use a different renderer like 'cloudflare'.",
      );
    }

    const puppeteerOptions: {
      headless: boolean;
      args: string[];
      executablePath?: string;
    } = {
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

    const puppeteerModule = puppeteer.default || puppeteer;
    const browser = await puppeteerModule.launch(puppeteerOptions);
    const page = await browser.newPage();

    await page.setViewport(size);

    // Get waitUntil strategy from environment variable or use networkidle2 as default
    // networkidle2 waits until there are no more than 2 network connections for at least 500ms
    // This ensures dynamic content and resources loaded by JavaScript are fully loaded
    type WaitUntilOption = 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
    const waitUntil = (process.env.BROWSER_WAIT_UNTIL || "networkidle2") as WaitUntilOption;
    
    logger.debug(
      { waitUntil, size },
      "PuppeteerBrowserRenderer: Setting page content and waiting for resources",
    );
    
    await page.setContent(htmlContent, { waitUntil });

    const buffer = (await page.screenshot({ path: imagePath })) as Buffer;

    await browser.close();

    const duration = Date.now() - startTime;
    logger.info(
      { imagePath, size, duration, bufferSize: buffer.length },
      "PuppeteerBrowserRenderer: Screenshot captured successfully",
    );

    return {
      path: imagePath,
      buffer,
    };
  }
}

export default PuppeteerBrowserRenderer;
