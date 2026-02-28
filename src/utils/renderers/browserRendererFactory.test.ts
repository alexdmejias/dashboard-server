import { _resetForTesting, initSettings, updateSettings } from "../../settings";
import ServiceRotator from "../ServiceRotator";
import BrowserlessIOBrowserRenderer from "./BrowserlessIOBrowserRenderer";
import { createBrowserRenderer } from "./browserRendererFactory";
import CloudflareBrowserRenderer from "./CloudflareBrowserRenderer";

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
  beforeEach(async () => {
    jest.clearAllMocks();
    _resetForTesting();
    await initSettings();
  });

  afterEach(() => {
    _resetForTesting();
  });

  it("should create Puppeteer renderer by default", () => {
    createBrowserRenderer();

    expect(PuppeteerBrowserRenderer).toHaveBeenCalledTimes(1);
    expect(CloudflareBrowserRenderer).not.toHaveBeenCalled();
    expect(BrowserlessIOBrowserRenderer).not.toHaveBeenCalled();
  });

  it("should create Puppeteer renderer when explicitly set", async () => {
    await updateSettings({ browserRenderer: "puppeteer" });

    createBrowserRenderer();

    expect(PuppeteerBrowserRenderer).toHaveBeenCalledTimes(1);
    expect(CloudflareBrowserRenderer).not.toHaveBeenCalled();
    expect(BrowserlessIOBrowserRenderer).not.toHaveBeenCalled();
  });

  it("should create Cloudflare renderer when configured", async () => {
    await updateSettings({
      browserRenderer: "cloudflare",
      cloudflareAccountId: "test-account-id",
      cloudflareApiToken: "test-api-token",
    });

    createBrowserRenderer();

    expect(CloudflareBrowserRenderer).toHaveBeenCalledWith({
      accountId: "test-account-id",
      apiToken: "test-api-token",
    });
    expect(PuppeteerBrowserRenderer).not.toHaveBeenCalled();
    expect(BrowserlessIOBrowserRenderer).not.toHaveBeenCalled();
  });

  it("should throw error when Cloudflare credentials are missing", async () => {
    await updateSettings({ browserRenderer: "cloudflare" });

    expect(() => createBrowserRenderer()).toThrow(
      "cloudflareAccountId and cloudflareApiToken",
    );
  });

  it("should throw error when only account ID is provided", async () => {
    await updateSettings({
      browserRenderer: "cloudflare",
      cloudflareAccountId: "test-account-id",
    });

    expect(() => createBrowserRenderer()).toThrow(
      "cloudflareAccountId and cloudflareApiToken",
    );
  });

  it("should throw error when only API token is provided", async () => {
    await updateSettings({
      browserRenderer: "cloudflare",
      cloudflareApiToken: "test-api-token",
    });

    expect(() => createBrowserRenderer()).toThrow(
      "cloudflareAccountId and cloudflareApiToken",
    );
  });

  it("should create Browserless renderer when configured", async () => {
    await updateSettings({
      browserRenderer: "browserless",
      browserlessIoToken: "test-token",
    });

    createBrowserRenderer();

    expect(BrowserlessIOBrowserRenderer).toHaveBeenCalledWith({
      token: "test-token",
    });
    expect(PuppeteerBrowserRenderer).not.toHaveBeenCalled();
    expect(CloudflareBrowserRenderer).not.toHaveBeenCalled();
  });

  it("should throw error when Browserless credentials are missing", async () => {
    await updateSettings({ browserRenderer: "browserless" });

    expect(() => createBrowserRenderer()).toThrow("browserlessIoToken");
  });

  it("should create ServiceRotator with multiple services in multi mode", async () => {
    await updateSettings({
      browserRenderer: "multi",
      enableCloudflareBrowserRendering: true,
      enableBrowserlessIO: true,
      cloudflareAccountId: "test-account-id",
      cloudflareApiToken: "test-api-token",
      browserlessIoToken: "test-token",
    });

    createBrowserRenderer();

    expect(ServiceRotator).toHaveBeenCalledTimes(1);
    expect(CloudflareBrowserRenderer).toHaveBeenCalledTimes(1);
    expect(BrowserlessIOBrowserRenderer).toHaveBeenCalledTimes(1);
  });

  it("should fallback to Puppeteer when multi mode has no enabled services", async () => {
    await updateSettings({
      browserRenderer: "multi",
      enableCloudflareBrowserRendering: false,
      enableBrowserlessIO: false,
    });

    createBrowserRenderer();

    expect(PuppeteerBrowserRenderer).toHaveBeenCalledTimes(1);
    expect(ServiceRotator).not.toHaveBeenCalled();
  });

  it("should skip services with missing credentials in multi mode", async () => {
    await updateSettings({
      browserRenderer: "multi",
      enableCloudflareBrowserRendering: true,
      enableBrowserlessIO: true,
      // Only provide Browserless credentials
      browserlessIoToken: "test-token",
    });

    createBrowserRenderer();

    expect(ServiceRotator).toHaveBeenCalledTimes(1);
    expect(CloudflareBrowserRenderer).not.toHaveBeenCalled();
    expect(BrowserlessIOBrowserRenderer).toHaveBeenCalledTimes(1);
  });
});
