import path from "path";

function imagesPath(fileName: string) {
  const screenshotPath = path.join(
    __dirname,
    "..",
    "public",
    "images",
    `${fileName}.png`
  );

  return screenshotPath;
}

export default imagesPath;
