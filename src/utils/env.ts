import fs from "node:fs";
import path from "node:path";
import { PROJECT_ROOT } from "./projectRoot";

/**
 * Returns the absolute path to the project's .env file.
 */
export function getEnvPath(): string {
  return path.join(PROJECT_ROOT, ".env");
}

/**
 * Updates a key/value pair in the .env file.
 * If the key already exists, its value is replaced in place.
 * If the key does not exist, the key=value line is appended.
 *
 * Uses a prefix-anchored regex (`^KEY=`) to avoid matching keys that share
 * a common prefix (e.g. GOOGLE_REFRESH_TOKEN vs GOOGLE_REFRESH_TOKEN_BACKUP).
 */
export function updateEnvValue(key: string, value: string): void {
  const envPath = getEnvPath();
  const lines = fs.readFileSync(envPath, "utf-8").split(/\r?\n/);
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const target = lines.findIndex((line) =>
    new RegExp(`^${escapedKey}=`).test(line),
  );

  if (target !== -1) {
    lines.splice(target, 1, `${key}=${value}`);
  } else {
    lines.push(`${key}=${value}`);
  }

  fs.writeFileSync(envPath, lines.join("\n"));
}
