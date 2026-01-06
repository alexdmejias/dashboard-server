import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest'
import CloudflareBrowserRenderer from "./CloudflareBrowserRenderer";
import { writeFile } from "node:fs/promises";

vi.mock("node:fs/promises");

describe("CloudflareBrowserRenderer", () => {
  const mockAccountId = "test-account-id";
  const mockApiToken = "test-api-token";

  let renderer: CloudflareBrowserRenderer;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    renderer = new CloudflareBrowserRenderer({
      accountId: mockAccountId,
      apiToken: mockApiToken,
    });
    originalFetch = global.fetch;
    (writeFile as Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should create a renderer with provided credentials", () => {
    expect(renderer).toBeInstanceOf(CloudflareBrowserRenderer);
  });

  it("should call Cloudflare API with correct parameters", async () => {
    const mockBuffer = Buffer.from("test screenshot");
    const mockArrayBuffer = mockBuffer.buffer.slice(
      mockBuffer.byteOffset,
      mockBuffer.byteOffset + mockBuffer.byteLength
    );

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(mockArrayBuffer),
    });

    const options = {
      htmlContent: "<html><body>Test</body></html>",
      imagePath: "/path/to/image.png",
      size: { width: 800, height: 600 },
    };

    const result = await renderer.renderPage(options);

    expect(global.fetch).toHaveBeenCalledWith(
      `https://api.cloudflare.com/client/v4/accounts/${mockAccountId}/browser/rendering`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: `Bearer ${mockApiToken}`,
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

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(mockArrayBuffer),
    });

    const options = {
      htmlContent: "<html><body>Test</body></html>",
      imagePath: "/path/to/image.png",
    };

    await renderer.renderPage(options);

    const fetchCall = (global.fetch as Mock).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);

    expect(body.options.viewport).toEqual({
      width: 1200,
      height: 825,
    });
  });

  it("should throw error when API request fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: vi.fn().mockResolvedValue("Invalid credentials"),
    });

    const options = {
      htmlContent: "<html><body>Test</body></html>",
      imagePath: "/path/to/image.png",
    };

    await expect(renderer.renderPage(options)).rejects.toThrow(
      "Cloudflare Browser Rendering failed"
    );
  });
});
