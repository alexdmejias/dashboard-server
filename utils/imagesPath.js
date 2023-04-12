import path from "path";
import { fileURLToPath } from "url";

function imagesPath(fileName) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
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
