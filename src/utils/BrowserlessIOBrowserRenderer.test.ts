import BrowserlessIOBrowserRenderer from "./BrowserlessIOBrowserRenderer";
import { writeFile } from "node:fs/promises";

jest.mock("node:fs/promises");

describe("BrowserlessIOBrowserRenderer", () => {
  const mockToken = "test-token";
  const mockEndpoint = "https://chrome.browserless.io";

  let renderer: BrowserlessIOBrowserRenderer;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    renderer = new BrowserlessIOBrowserRenderer({
      token: mockToken,
      endpoint: mockEndpoint,
    });
    originalFetch = global.fetch;
    (writeFile as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should create a renderer with provided credentials", () => {
    expect(renderer).toBeInstanceOf(BrowserlessIOBrowserRenderer);
  });

  it("should call Browserless.io API with correct parameters", async () => {
    const mockBuffer = Buffer.from("test screenshot");
    const mockArrayBuffer = mockBuffer.buffer.slice(
      mockBuffer.byteOffset,
      mockBuffer.byteOffset + mockBuffer.byteLength
    );

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: jest.fn().mockResolvedValue(mockArrayBuffer),
    });

    const options = {
      htmlContent: "<html><body>Test</body></html>",
      imagePath: "/path/to/image.png",
      size: { width: 800, height: 600 },
    };

    const result = await renderer.renderPage(options);

    expect(global.fetch).toHaveBeenCalledWith(
      `${mockEndpoint}/screenshot`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: `Bearer ${mockToken}`,
          "Content-Type": "application/json",
        }),
        body: expect.stringContaining("viewport"),
      })
    );

    expect(writeFile).toHaveBeenCalledWith(
      options.imagePath,
      expect.any(Buffer)
    );

    expect(result).toEqual({
      path: options.imagePath,
      buffer: expect.any(Buffer),
    });
  });

  it("should use default size when not provided", async () => {
    const mockBuffer = Buffer.from("test screenshot");
    const mockArrayBuffer = mockBuffer.buffer.slice(
      mockBuffer.byteOffset,
      mockBuffer.byteOffset + mockBuffer.byteLength
    );

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: jest.fn().mockResolvedValue(mockArrayBuffer),
    });

    const options = {
      htmlContent: "<html><body>Test</body></html>",
      imagePath: "/path/to/image.png",
    };

    await renderer.renderPage(options);

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);

    expect(body.options.viewport).toEqual({
      width: 1200,
      height: 825,
    });
  });

  it("should include fullPage and type options in the request", async () => {
    const mockBuffer = Buffer.from("test screenshot");
    const mockArrayBuffer = mockBuffer.buffer.slice(
      mockBuffer.byteOffset,
      mockBuffer.byteOffset + mockBuffer.byteLength
    );

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: jest.fn().mockResolvedValue(mockArrayBuffer),
    });

    const options = {
      htmlContent: "<html><body>Test</body></html>",
      imagePath: "/path/to/image.png",
    };

    await renderer.renderPage(options);

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);

    expect(body.options.fullPage).toBe(false);
    expect(body.options.type).toBe("png");
  });

  it("should throw error when API request fails", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: jest.fn().mockResolvedValue("Invalid token"),
    });

    const options = {
      htmlContent: "<html><body>Test</body></html>",
      imagePath: "/path/to/image.png",
    };

    await expect(renderer.renderPage(options)).rejects.toThrow(
      "Browserless.io rendering failed"
    );
  });
});
