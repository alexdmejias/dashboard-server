import { mkdtempSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import logger from "../logger";
import { getSettings } from "../settings";

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

export function getImagesDir(): string {
  if (!imagesPath) {
    imagesPath = makeDir();
  }

  return imagesPath;
}

/**
 * Clears all files from the images directory on server startup
 * @returns number of files removed
 */
export function clearImagesOnStartup(): number {
  if (!imagesPath) {
    imagesPath = makeDir();
    logger.info(`Created new tmpdir for images: ${imagesPath}`);
    return 0;
  }

  try {
    const files = readdirSync(imagesPath);
    let removedCount = 0;

    for (const file of files) {
      const filePath = join(imagesPath, file);
      try {
        const stats = statSync(filePath);
        if (stats.isFile()) {
          unlinkSync(filePath);
          removedCount++;
        }
      } catch (err) {
        logger.warn(
          { err, filePath },
          "Failed to remove file during startup cleanup",
        );
      }
    }

    if (removedCount > 0) {
      logger.info(
        { removedCount, imagesPath },
        `Cleared ${removedCount} file(s) from tmpdir on startup`,
      );
    }

    return removedCount;
  } catch (err) {
    logger.error({ err, imagesPath }, "Failed to clear images on startup");
    return 0;
  }
}

/**
 * Removes oldest files from the images directory if count exceeds maxToKeep
 * @param maxToKeep - maximum number of images to keep (default from settings or 1000)
 * @returns number of files removed
 */
export function cleanupOldImages(
  maxToKeep: number = getSettings().maxImagesToKeep,
): number {
  if (!imagesPath) {
    return 0;
  }

  try {
    const files = readdirSync(imagesPath);
    const imageFiles = files.filter((file) => {
      const filePath = join(imagesPath, file);
      try {
        const stats = statSync(filePath);
        return stats.isFile();
      } catch {
        return false;
      }
    });

    if (imageFiles.length <= maxToKeep) {
      return 0;
    }

    // Sort files by modification time (oldest first)
    const filesWithStats = imageFiles
      .map((file) => {
        const filePath = join(imagesPath, file);
        try {
          const stats = statSync(filePath);
          return { file, filePath, mtime: stats.mtime.getTime() };
        } catch {
          return null;
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => a.mtime - b.mtime);

    const filesToRemove = filesWithStats.slice(
      0,
      filesWithStats.length - maxToKeep,
    );
    let removedCount = 0;

    for (const { filePath } of filesToRemove) {
      try {
        unlinkSync(filePath);
        removedCount++;
      } catch (err) {
        logger.warn({ err, filePath }, "Failed to remove old image file");
      }
    }

    if (removedCount > 0) {
      logger.info(
        { removedCount, maxToKeep, totalFiles: imageFiles.length },
        `Removed ${removedCount} old image(s) to maintain limit of ${maxToKeep}`,
      );
    }

    return removedCount;
  } catch (err) {
    logger.error({ err, imagesPath }, "Failed to cleanup old images");
    return 0;
  }
}

export default imagesPath;
