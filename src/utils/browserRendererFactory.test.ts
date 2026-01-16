import { createBrowserRenderer } from "./browserRendererFactory";
import CloudflareBrowserRenderer from "./CloudflareBrowserRenderer";
import PuppeteerBrowserRenderer from "./PuppeteerBrowserRenderer";

jest.mock("./CloudflareBrowserRenderer");
jest.mock("./PuppeteerBrowserRenderer");

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
  });

  it("should create Puppeteer renderer when explicitly set", () => {
    process.env.BROWSER_RENDERER = "puppeteer";

    createBrowserRenderer();

    expect(PuppeteerBrowserRenderer).toHaveBeenCalledTimes(1);
    expect(CloudflareBrowserRenderer).not.toHaveBeenCalled();
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
});
