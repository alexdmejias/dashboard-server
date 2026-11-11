import type {
  BrowserRenderer,
  RenderOptions,
  RenderResult,
} from "../../types/browser-renderer";
import logger from "../../logger";
import { FONTS_READY_FALLBACK_MS } from "./fontsReady";

// The parts of the page's DOM that waitForFonts uses. This project's tsconfig
// has no DOM types.
interface StylesheetLink {
  sheet: unknown;
  addEventListener(
    type: "load" | "error",
    listener: () => void,
    options: { once: true },
  ): void;
}
interface PageDocument {
  body: { getBoundingClientRect(): unknown } | null;
  fonts: Iterable<{ family: string; status: string }> & {
    ready: Promise<unknown>;
  };
  querySelectorAll(selector: string): Iterable<StylesheetLink>;
}
interface FontsResult {
  timedOut: boolean;
  failed: string[];
}
interface EvaluatingPage {
  evaluate(
    fn: (fallbackMs: number) => Promise<FontsResult>,
    fallbackMs: number,
  ): Promise<FontsResult>;
}

/**
 * Waits for stylesheets and web fonts to load. `networkidle2` tolerates two
 * open requests, so it can return while TRMNL's 18MB stylesheet or a font is
 * still downloading, and the screenshot then has no text. Gives up after
 * FONTS_READY_FALLBACK_MS.
 */
async function waitForFonts(page: EvaluatingPage): Promise<void> {
  const fontsStartTime = Date.now();
  const result = await page.evaluate(async (fallbackMs) => {
    // Runs in the browser.
    const { document } = globalThis as unknown as { document: PageDocument };
    const ready = (async () => {
      // The stylesheets declare the fonts, so wait for them first. Not via
      // document.readyState: setContent() writes into the initial blank
      // page, which is already "complete".
      const pendingStylesheets = [
        ...document.querySelectorAll('link[rel="stylesheet"]'),
      ].filter((link) => !link.sheet);
      await Promise.all(
        pendingStylesheets.map(
          (link) =>
            new Promise<void>((resolve) => {
              link.addEventListener("load", resolve, { once: true });
              link.addEventListener("error", resolve, { once: true });
            }),
        ),
      );
      // Fonts only start loading once text using them is laid out.
      document.body?.getBoundingClientRect();
      await document.fonts.ready;
      return false;
    })();
    const timedOut = await Promise.race([
      ready,
      new Promise<boolean>((resolve) =>
        setTimeout(() => resolve(true), fallbackMs),
      ),
    ]);
    // fonts.ready also resolves when a font fails to load, so report those.
    const failed = [...document.fonts]
      .filter((font) => font.status === "error")
      .map((font) => font.family);
    return { timedOut, failed };
  }, FONTS_READY_FALLBACK_MS);

  const duration = Date.now() - fontsStartTime;
  if (result.timedOut || result.failed.length > 0) {
    logger.warn(
      { ...result, duration },
      "PuppeteerBrowserRenderer: Fonts not ready, taking screenshot anyway",
    );
  } else {
    logger.debug({ duration }, "PuppeteerBrowserRenderer: Fonts ready");
  }
}

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
    await waitForFonts(page);

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
