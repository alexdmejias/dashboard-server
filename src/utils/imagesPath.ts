import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let imagesPath = "";

function makeDir() {
  const dirName = mkdtempSync(join(tmpdir(), "dashboard-server-"));

  return dirName;
}

export function getImagesPath(imageName = "image.png") {
  if (!imagesPath) {
    imagesPath = makeDir();
  }

  return join(imagesPath, imageName);
}

export default imagesPath;
