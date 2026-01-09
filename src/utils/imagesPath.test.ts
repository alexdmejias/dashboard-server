import { writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  cleanupOldImages,
  clearImagesOnStartup,
  getImagesPath,
} from "./imagesPath";

describe("imagesPath utilities", () => {
  describe("getImagesPath", () => {
    it("should return a path in tmpdir", () => {
      const imagePath = getImagesPath("test.png");
      expect(imagePath).toContain("dashboard-server-");
      expect(imagePath).toContain("test.png");
    });

    it("should use the same directory for multiple calls", () => {
      const path1 = getImagesPath("image1.png");
      const path2 = getImagesPath("image2.png");
      const dir1 = path1.substring(0, path1.lastIndexOf("/"));
      const dir2 = path2.substring(0, path2.lastIndexOf("/"));
      expect(dir1).toBe(dir2);
    });
  });

  describe("clearImagesOnStartup", () => {
    it("should clear existing files on startup", () => {
      // Create some test files
      const file1 = getImagesPath("test1.png");
      const file2 = getImagesPath("test2.png");
      writeFileSync(file1, "test data 1");
      writeFileSync(file2, "test data 2");

      expect(existsSync(file1)).toBe(true);
      expect(existsSync(file2)).toBe(true);

      const removedCount = clearImagesOnStartup();
      expect(removedCount).toBe(2);
      expect(existsSync(file1)).toBe(false);
      expect(existsSync(file2)).toBe(false);
    });

    it("should return 0 if no files to remove", () => {
      const removedCount = clearImagesOnStartup();
      expect(removedCount).toBe(0);
    });
  });

  describe("cleanupOldImages", () => {
    beforeEach(() => {
      // Clear any existing files
      clearImagesOnStartup();
    });

    it("should not remove files if under the limit", () => {
      const file1 = getImagesPath("test1.png");
      const file2 = getImagesPath("test2.png");
      writeFileSync(file1, "test data 1");
      writeFileSync(file2, "test data 2");

      const removedCount = cleanupOldImages(10);
      expect(removedCount).toBe(0);
      expect(existsSync(file1)).toBe(true);
      expect(existsSync(file2)).toBe(true);
    });

    it("should remove oldest files when over the limit", () => {
      // Create files with slight delays to ensure different mtimes
      const file1 = getImagesPath("test1.png");
      writeFileSync(file1, "test data 1");

      // Small delay to ensure different mtime
      const start = Date.now();
      while (Date.now() - start < 10) {
        // busy wait
      }

      const file2 = getImagesPath("test2.png");
      writeFileSync(file2, "test data 2");

      const start2 = Date.now();
      while (Date.now() - start2 < 10) {
        // busy wait
      }

      const file3 = getImagesPath("test3.png");
      writeFileSync(file3, "test data 3");

      // Keep only 2 files, should remove the oldest one
      const removedCount = cleanupOldImages(2);
      expect(removedCount).toBe(1);

      // Oldest file should be removed
      expect(existsSync(file1)).toBe(false);
      // Newer files should remain
      expect(existsSync(file2)).toBe(true);
      expect(existsSync(file3)).toBe(true);
    });

    it("should return 0 if no images directory exists", () => {
      // This is a bit tricky since getImagesPath creates the directory
      // but we can test the logic by not creating any files
      const removedCount = cleanupOldImages(10);
      expect(removedCount).toBe(0);
    });
  });
});
