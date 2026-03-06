import type {
  BrowserRenderer,
  RenderOptions,
  RenderResult,
} from "../../types/browser-renderer";

class PuppeteerBrowserRenderer implements BrowserRenderer {
  async renderPage(options: RenderOptions): Promise<RenderResult> {
    const {
      htmlContent,
      imagePath,
      size = { width: 1200, height: 825 },
    } = options;

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

    await page.setContent(htmlContent);

    const buffer = (await page.screenshot({ path: imagePath })) as Buffer;

    await browser.close();

    return {
      path: imagePath,
      buffer,
    };
  }
}

export default PuppeteerBrowserRenderer;
