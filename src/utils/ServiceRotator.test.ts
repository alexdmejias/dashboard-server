import ServiceRotator, { ServiceConfig } from "./ServiceRotator";
import {
  BrowserRenderer,
  RenderOptions,
  RenderResult,
} from "../types/browser-renderer";

// Mock logger
jest.mock("../logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe("ServiceRotator", () => {
  let mockRenderer1: BrowserRenderer;
  let mockRenderer2: BrowserRenderer;
  let mockRenderer3: BrowserRenderer;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRenderer1 = {
      renderPage: jest.fn().mockResolvedValue({
        path: "/path/to/image1.png",
        buffer: Buffer.from("test1"),
      }),
    };

    mockRenderer2 = {
      renderPage: jest.fn().mockResolvedValue({
        path: "/path/to/image2.png",
        buffer: Buffer.from("test2"),
      }),
    };

    mockRenderer3 = {
      renderPage: jest.fn().mockResolvedValue({
        path: "/path/to/image3.png",
        buffer: Buffer.from("test3"),
      }),
    };
  });

  it("should throw error if no services provided", () => {
    expect(() => new ServiceRotator([])).toThrow(
      "ServiceRotator requires at least one service"
    );
  });

  it("should create a rotator with provided services", () => {
    const services: ServiceConfig[] = [
      { name: "service1", renderer: mockRenderer1 },
    ];
    const rotator = new ServiceRotator(services);
    expect(rotator).toBeInstanceOf(ServiceRotator);
    expect(rotator.getServices()).toEqual(["service1"]);
  });

  it("should rotate between services in round-robin fashion", async () => {
    const services: ServiceConfig[] = [
      { name: "service1", renderer: mockRenderer1 },
      { name: "service2", renderer: mockRenderer2 },
      { name: "service3", renderer: mockRenderer3 },
    ];
    const rotator = new ServiceRotator(services);

    const options: RenderOptions = {
      htmlContent: "<html><body>Test</body></html>",
      imagePath: "/path/to/image.png",
      size: { width: 800, height: 600 },
    };

    // First call should use service1
    await rotator.renderPage(options);
    expect(mockRenderer1.renderPage).toHaveBeenCalledTimes(1);
    expect(mockRenderer2.renderPage).toHaveBeenCalledTimes(0);
    expect(mockRenderer3.renderPage).toHaveBeenCalledTimes(0);

    // Second call should use service2
    await rotator.renderPage(options);
    expect(mockRenderer1.renderPage).toHaveBeenCalledTimes(1);
    expect(mockRenderer2.renderPage).toHaveBeenCalledTimes(1);
    expect(mockRenderer3.renderPage).toHaveBeenCalledTimes(0);

    // Third call should use service3
    await rotator.renderPage(options);
    expect(mockRenderer1.renderPage).toHaveBeenCalledTimes(1);
    expect(mockRenderer2.renderPage).toHaveBeenCalledTimes(1);
    expect(mockRenderer3.renderPage).toHaveBeenCalledTimes(1);

    // Fourth call should cycle back to service1
    await rotator.renderPage(options);
    expect(mockRenderer1.renderPage).toHaveBeenCalledTimes(2);
    expect(mockRenderer2.renderPage).toHaveBeenCalledTimes(1);
    expect(mockRenderer3.renderPage).toHaveBeenCalledTimes(1);
  });

  it("should fallback to next service when one fails", async () => {
    const failingRenderer: BrowserRenderer = {
      renderPage: jest
        .fn()
        .mockRejectedValue(new Error("Service unavailable")),
    };

    const services: ServiceConfig[] = [
      { name: "failing-service", renderer: failingRenderer },
      { name: "working-service", renderer: mockRenderer2 },
    ];
    const rotator = new ServiceRotator(services);

    const options: RenderOptions = {
      htmlContent: "<html><body>Test</body></html>",
      imagePath: "/path/to/image.png",
      size: { width: 800, height: 600 },
    };

    const result = await rotator.renderPage(options);

    // Should try the failing service first, then fallback to working service
    expect(failingRenderer.renderPage).toHaveBeenCalledTimes(1);
    expect(mockRenderer2.renderPage).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      path: "/path/to/image2.png",
      buffer: Buffer.from("test2"),
    });
  });

  it("should throw error when all services fail", async () => {
    const failingRenderer1: BrowserRenderer = {
      renderPage: jest.fn().mockRejectedValue(new Error("Service 1 failed")),
    };

    const failingRenderer2: BrowserRenderer = {
      renderPage: jest.fn().mockRejectedValue(new Error("Service 2 failed")),
    };

    const services: ServiceConfig[] = [
      { name: "service1", renderer: failingRenderer1 },
      { name: "service2", renderer: failingRenderer2 },
    ];
    const rotator = new ServiceRotator(services);

    const options: RenderOptions = {
      htmlContent: "<html><body>Test</body></html>",
      imagePath: "/path/to/image.png",
      size: { width: 800, height: 600 },
    };

    await expect(rotator.renderPage(options)).rejects.toThrow(
      "All rendering services failed"
    );

    // Both services should have been tried
    expect(failingRenderer1.renderPage).toHaveBeenCalledTimes(1);
    expect(failingRenderer2.renderPage).toHaveBeenCalledTimes(1);
  });

  it("should handle single service correctly", async () => {
    const services: ServiceConfig[] = [
      { name: "only-service", renderer: mockRenderer1 },
    ];
    const rotator = new ServiceRotator(services);

    const options: RenderOptions = {
      htmlContent: "<html><body>Test</body></html>",
      imagePath: "/path/to/image.png",
    };

    // Multiple calls should all use the same service
    await rotator.renderPage(options);
    await rotator.renderPage(options);
    await rotator.renderPage(options);

    expect(mockRenderer1.renderPage).toHaveBeenCalledTimes(3);
  });

  it("should return correct service names", () => {
    const services: ServiceConfig[] = [
      { name: "cloudflare", renderer: mockRenderer1 },
      { name: "browserless", renderer: mockRenderer2 },
    ];
    const rotator = new ServiceRotator(services);

    expect(rotator.getServices()).toEqual(["cloudflare", "browserless"]);
  });
});
