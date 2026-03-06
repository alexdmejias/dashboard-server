import { readFile } from "node:fs/promises";
import { Jimp } from "jimp";
import type { BrowserRenderer } from "../types/browser-renderer";
import { createBrowserRenderer } from "./browserRendererFactory";
import { getScreenshotWithoutFetching } from "./getScreenshot";

jest.mock("jimp");
jest.mock("node:fs/promises");
jest.mock("./browserRendererFactory");

describe("utils:getScreenshot", () => {
  const mockRenderPage = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (createBrowserRenderer as jest.Mock).mockReturnValue({
      renderPage: mockRenderPage,
    } as BrowserRenderer);
  });

  it("should generate a screenshot and return the path and buffer", async () => {
    const mockBufferContent = "mocked screenshot buffer";
    mockRenderPage.mockResolvedValue({
      path: "/path/to/image.png",
      buffer: Buffer.from(mockBufferContent),
    });

    const options = {
      htmlContent: "<html></html>",
      imagePath: "/path/to/image.png",
      viewType: "png",
      size: { width: 800, height: 600 },
    };
    const result = await getScreenshotWithoutFetching(options);

    expect(mockRenderPage).toHaveBeenCalledWith({
      htmlContent: options.htmlContent,
      imagePath: options.imagePath,
      size: options.size,
    });
    expect(result).toEqual({
      path: options.imagePath,
      buffer: Buffer.from(mockBufferContent),
    });
  });

  it("should convert the screenshot to BMP format if viewType is 'bmp'", async () => {
    const mockBufferContentSource = "mocked image buffer";
    const mockBufferContentConverted = "mocked screenshot buffer";
    mockRenderPage.mockResolvedValue({
      path: "/path/to/image.bmp",
      buffer: Buffer.from(mockBufferContentConverted),
    });

    const mockWrite = jest.fn();
    (Jimp.read as jest.Mock).mockImplementation(() => {
      return Promise.resolve({
        write: mockWrite,
        getBuffer: jest.fn(() => {
          return Buffer.from(mockBufferContentConverted);
        }),
      });
    });

    (readFile as jest.Mock).mockImplementation(() => {
      return Promise.resolve(Buffer.from(mockBufferContentSource));
    });

    const options = {
      htmlContent: "<html></html>",
      imagePath: "/path/to/image.bmp",
      viewType: "bmp",
      size: { width: 800, height: 600 },
    };
    const result = await getScreenshotWithoutFetching(options);

    expect(readFile).toHaveBeenCalledWith(options.imagePath);
    expect(Jimp.read).toHaveBeenCalledWith(
      Buffer.from(mockBufferContentSource),
    );
    expect(mockWrite).toHaveBeenCalledWith(options.imagePath);
    expect(result).toEqual({
      path: options.imagePath,
      buffer: Buffer.from(mockBufferContentConverted),
    });
  });

  it("should use the default size if no size is provided", async () => {
    mockRenderPage.mockResolvedValue({
      path: "/path/to/image.png",
      buffer: Buffer.from("mocked screenshot buffer"),
    });

    await getScreenshotWithoutFetching({
      htmlContent: "<html></html>",
      imagePath: "/path/to/image.png",
      viewType: "png",
    });

    expect(mockRenderPage).toHaveBeenCalledWith({
      htmlContent: "<html></html>",
      imagePath: "/path/to/image.png",
      size: undefined,
    });
  });

  it("should propagate browser renderer errors", async () => {
    const errorMessage =
      "Cloudflare Browser Rendering failed: 401 Unauthorized - Invalid credentials";
    mockRenderPage.mockRejectedValue(new Error(errorMessage));

    const options = {
      htmlContent: "<html></html>",
      imagePath: "/path/to/image.png",
      viewType: "png",
    };

    await expect(getScreenshotWithoutFetching(options)).rejects.toThrow(
      errorMessage,
    );
  });
});
