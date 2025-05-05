import puppeteer from "puppeteer";
import { Jimp } from "jimp";
import getRenderedTemplate from "./getRenderedTemplate";
import { readFile } from "node:fs/promises";
import getScreenshot from "./getScreenshot";

jest.mock("puppeteer");
jest.mock("jimp");
jest.mock("./getRenderedTemplate");
jest.mock("node:fs/promises");

describe("utils:getScreenshot", () => {
  const mockNewPage = jest.fn();
  const mockSetViewport = jest.fn();
  const mockSetContent = jest.fn();
  const mockScreenshot = jest.fn();
  const mockClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (puppeteer.launch as jest.Mock).mockImplementation(() => ({
      newPage: mockNewPage,
      close: mockClose,
    }));

    mockNewPage.mockResolvedValue({
      setViewport: mockSetViewport,
      setContent: mockSetContent,
      screenshot: mockScreenshot,
    });

    (getRenderedTemplate as jest.Mock).mockReturnValue("<html></html>");
  });

  it("should generate a screenshot and return the path and buffer", async () => {
    const mockBufferContent = "mocked screenshot buffer";
    mockScreenshot.mockResolvedValue(Buffer.from(mockBufferContent));

    const options = {
      template: "testTemplate",
      data: { key: "value" },
      imagePath: "/path/to/image.png",
      viewType: "png",
      size: { width: 800, height: 600 },
    };
    const result = await getScreenshot(options);

    expect(puppeteer.launch).toHaveBeenCalledWith(
      expect.objectContaining({
        headless: true,
        args: expect.arrayContaining(["--no-sandbox"]),
      })
    );
    expect(mockNewPage).toHaveBeenCalled();
    expect(mockSetViewport).toHaveBeenCalledWith(options.size);
    expect(getRenderedTemplate).toHaveBeenCalledWith({
      template: options.template,
      data: options.data,
    });
    expect(mockSetContent).toHaveBeenCalledWith("<html></html>");
    expect(mockScreenshot).toHaveBeenCalledWith({ path: options.imagePath });
    expect(mockClose).toHaveBeenCalled();
    expect(result).toEqual({
      path: options.imagePath,
      buffer: Buffer.from(mockBufferContent),
    });
  });

  it("should convert the screenshot to BMP format if viewType is 'bmp'", async () => {
    const mockBufferContentSource = "mocked image buffer";
    const mockBufferContentConverted = "mocked screenshot buffer";
    mockScreenshot.mockResolvedValue(Buffer.from(mockBufferContentConverted));

    const mockWrite = jest.fn(); // Mock the write method
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
      template: "testTemplate",
      data: { key: "value" },
      imagePath: "/path/to/image.bmp",
      viewType: "bmp",
      size: { width: 800, height: 600 },
    };
    const result = await getScreenshot(options);

    expect(readFile).toHaveBeenCalledWith(options.imagePath);
    expect(Jimp.read).toHaveBeenCalledWith(
      Buffer.from(mockBufferContentSource)
    );
    expect(mockWrite).toHaveBeenCalledWith(options.imagePath);
    expect(result).toEqual({
      path: options.imagePath,
      buffer: Buffer.from(mockBufferContentConverted),
    });
  });

  it("should use the default size if no size is provided", async () => {
    mockScreenshot.mockResolvedValue(Buffer.from("mocked screenshot buffer"));

    await getScreenshot({
      template: "testTemplate",
      data: { key: "value" },
      imagePath: "/path/to/image.png",
      viewType: "png",
    });

    expect(mockSetViewport).toHaveBeenCalledWith({ width: 1200, height: 825 });
  });
});
