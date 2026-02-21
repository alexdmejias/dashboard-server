import { createBrowserRenderer } from "./browserRendererFactory";
import CloudflareBrowserRenderer from "./CloudflareBrowserRenderer";
import BrowserlessIOBrowserRenderer from "./BrowserlessIOBrowserRenderer";
import ServiceRotator from "./ServiceRotator";

jest.mock("./CloudflareBrowserRenderer");
jest.mock("./BrowserlessIOBrowserRenderer");
jest.mock("./ServiceRotator");

// Mock PuppeteerBrowserRenderer to avoid puppeteer import issues
jest.mock("./PuppeteerBrowserRenderer", () => {
  return jest.fn().mockImplementation(() => ({
    renderPage: jest.fn(),
  }));
});

const PuppeteerBrowserRenderer = require("./PuppeteerBrowserRenderer");

describe("browserRendererFactory", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should create Puppeteer renderer by default", () => {
    delete process.env.BROWSER_RENDERER;

    createBrowserRenderer();

    expect(PuppeteerBrowserRenderer).toHaveBeenCalledTimes(1);
    expect(CloudflareBrowserRenderer).not.toHaveBeenCalled();
    expect(BrowserlessIOBrowserRenderer).not.toHaveBeenCalled();
  });

  it("should create Puppeteer renderer when explicitly set", () => {
    process.env.BROWSER_RENDERER = "puppeteer";

    createBrowserRenderer();

    expect(PuppeteerBrowserRenderer).toHaveBeenCalledTimes(1);
    expect(CloudflareBrowserRenderer).not.toHaveBeenCalled();
    expect(BrowserlessIOBrowserRenderer).not.toHaveBeenCalled();
  });

  it("should create Cloudflare renderer when configured", () => {
    process.env.BROWSER_RENDERER = "cloudflare";
    process.env.CLOUDFLARE_ACCOUNT_ID = "test-account-id";
    process.env.CLOUDFLARE_API_TOKEN = "test-api-token";

    createBrowserRenderer();

    expect(CloudflareBrowserRenderer).toHaveBeenCalledWith({
      accountId: "test-account-id",
      apiToken: "test-api-token",
    });
    expect(PuppeteerBrowserRenderer).not.toHaveBeenCalled();
    expect(BrowserlessIOBrowserRenderer).not.toHaveBeenCalled();
  });

  it("should throw error when Cloudflare credentials are missing", () => {
    process.env.BROWSER_RENDERER = "cloudflare";
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_API_TOKEN;

    expect(() => createBrowserRenderer()).toThrow(
      "Cloudflare Browser Renderer requires CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN"
    );
  });

  it("should throw error when only account ID is provided", () => {
    process.env.BROWSER_RENDERER = "cloudflare";
    process.env.CLOUDFLARE_ACCOUNT_ID = "test-account-id";
    delete process.env.CLOUDFLARE_API_TOKEN;

    expect(() => createBrowserRenderer()).toThrow(
      "Cloudflare Browser Renderer requires CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN"
    );
  });

  it("should throw error when only API token is provided", () => {
    process.env.BROWSER_RENDERER = "cloudflare";
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    process.env.CLOUDFLARE_API_TOKEN = "test-api-token";

    expect(() => createBrowserRenderer()).toThrow(
      "Cloudflare Browser Renderer requires CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN"
    );
  });

  it("should create Browserless renderer when configured", () => {
    process.env.BROWSER_RENDERER = "browserless";
    process.env.BROWSERLESS_IO_TOKEN = "test-token";
    process.env.BROWSERLESS_IO_ENDPOINT = "https://chrome.browserless.io";

    createBrowserRenderer();

    expect(BrowserlessIOBrowserRenderer).toHaveBeenCalledWith({
      token: "test-token",
      endpoint: "https://chrome.browserless.io",
    });
    expect(PuppeteerBrowserRenderer).not.toHaveBeenCalled();
    expect(CloudflareBrowserRenderer).not.toHaveBeenCalled();
  });

  it("should throw error when Browserless credentials are missing", () => {
    process.env.BROWSER_RENDERER = "browserless";
    delete process.env.BROWSERLESS_IO_TOKEN;
    delete process.env.BROWSERLESS_IO_ENDPOINT;

    expect(() => createBrowserRenderer()).toThrow(
      "Browserless.io Browser Renderer requires BROWSERLESS_IO_TOKEN env variable and browserlessEndpoint setting"
    );
  });

  it("should create ServiceRotator with multiple services in multi mode", () => {
    process.env.BROWSER_RENDERER = "multi";
    process.env.ENABLE_CLOUDFLARE_BROWSER_RENDERING = "true";
    process.env.ENABLE_BROWSERLESS_IO = "true";
    process.env.CLOUDFLARE_ACCOUNT_ID = "test-account-id";
    process.env.CLOUDFLARE_API_TOKEN = "test-api-token";
    process.env.BROWSERLESS_IO_TOKEN = "test-token";
    process.env.BROWSERLESS_IO_ENDPOINT = "https://chrome.browserless.io";

    createBrowserRenderer();

    expect(ServiceRotator).toHaveBeenCalledTimes(1);
    expect(CloudflareBrowserRenderer).toHaveBeenCalledTimes(1);
    expect(BrowserlessIOBrowserRenderer).toHaveBeenCalledTimes(1);
  });

  it("should fallback to Puppeteer when multi mode has no enabled services", () => {
    process.env.BROWSER_RENDERER = "multi";
    process.env.ENABLE_CLOUDFLARE_BROWSER_RENDERING = "false";
    process.env.ENABLE_BROWSERLESS_IO = "false";

    createBrowserRenderer();

    expect(PuppeteerBrowserRenderer).toHaveBeenCalledTimes(1);
    expect(ServiceRotator).not.toHaveBeenCalled();
  });

  it("should skip services with missing credentials in multi mode", () => {
    process.env.BROWSER_RENDERER = "multi";
    process.env.ENABLE_CLOUDFLARE_BROWSER_RENDERING = "true";
    process.env.ENABLE_BROWSERLESS_IO = "true";
    // Only provide Browserless credentials
    process.env.BROWSERLESS_IO_TOKEN = "test-token";
    process.env.BROWSERLESS_IO_ENDPOINT = "https://chrome.browserless.io";

    createBrowserRenderer();

    expect(ServiceRotator).toHaveBeenCalledTimes(1);
    expect(CloudflareBrowserRenderer).not.toHaveBeenCalled();
    expect(BrowserlessIOBrowserRenderer).toHaveBeenCalledTimes(1);
  });
});
