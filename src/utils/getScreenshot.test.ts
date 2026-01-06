import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { readFile } from "node:fs/promises";
import { Jimp } from "jimp";
import type { BrowserRenderer } from "../types/browser-renderer";
import { createBrowserRenderer } from "./browserRendererFactory";
import getRenderedTemplate from "./getRenderedTemplate";
import getScreenshot from "./getScreenshot";

vi.mock("jimp");
vi.mock("./getRenderedTemplate");
vi.mock("node:fs/promises");
vi.mock("./browserRendererFactory");

describe("utils:getScreenshot", () => {
  const mockRenderPage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (createBrowserRenderer as Mock).mockReturnValue({
      renderPage: mockRenderPage,
    } as BrowserRenderer);

    (getRenderedTemplate as Mock).mockReturnValue("<html></html>");
  });

  it("should generate a screenshot and return the path and buffer", async () => {
    const mockBufferContent = "mocked screenshot buffer";
    mockRenderPage.mockResolvedValue({
      path: "/path/to/image.png",
      buffer: Buffer.from(mockBufferContent),
    });

    const options = {
      template: "testTemplate",
      data: { key: "value" },
      imagePath: "/path/to/image.png",
      viewType: "png",
      size: { width: 800, height: 600 },
    };
    const result = await getScreenshot(options);

    expect(getRenderedTemplate).toHaveBeenCalledWith({
      template: options.template,
      data: options.data,
    });
    expect(mockRenderPage).toHaveBeenCalledWith({
      htmlContent: "<html></html>",
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

    const mockWrite = vi.fn();
    (Jimp.read as Mock).mockImplementation(() => {
      return Promise.resolve({
        write: mockWrite,
        getBuffer: vi.fn(() => {
          return Buffer.from(mockBufferContentConverted);
        }),
      });
    });

    (readFile as Mock).mockImplementation(() => {
      return Promise.resolve(Buffer.from(mockBufferContentSource));
    });

    const options = {
      template: "testTemplate",
      data: { key: "value" },
      imagePath: "/path/to/image.bmp",
      viewType: "bmp",
      size: { width: 800, height: 600 },
    };
    const result = await getScreenshot(options);

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

    await getScreenshot({
      template: "testTemplate",
      data: { key: "value" },
      imagePath: "/path/to/image.png",
      viewType: "png",
    });

    expect(mockRenderPage).toHaveBeenCalledWith({
      htmlContent: "<html></html>",
      imagePath: "/path/to/image.png",
      size: { width: 1200, height: 825 },
    });
  });
});
