import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Gets the project root directory by looking for package.json
 * Works both in development (tsx) and production (compiled to dist/)
 */
export function getProjectRoot(): string {
  // Start from the current file's directory
  let currentDir = __dirname;

  // Keep going up until we find package.json
  while (currentDir !== path.parse(currentDir).root) {
    if (fs.existsSync(path.join(currentDir, "package.json"))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  // Fallback to process.cwd() if package.json not found
  return process.cwd();
}

export const PROJECT_ROOT = getProjectRoot();
