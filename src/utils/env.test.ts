import { describe, it, expect, afterEach, vi, type Mock } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getEnvPath, updateEnvValue } from "./env";

vi.mock("node:fs", () => ({
  default: {
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    existsSync: vi.fn().mockReturnValue(true),
  },
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn().mockReturnValue(true),
}));

describe("env utilities", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getEnvPath", () => {
    it("should return an absolute path ending with .env", () => {
      const envPath = getEnvPath();
      expect(path.isAbsolute(envPath)).toBe(true);
      expect(envPath).toMatch(/\.env$/);
    });
  });

  describe("updateEnvValue", () => {
    it("should update an existing key in the .env file", () => {
      (fs.readFileSync as Mock).mockReturnValue(
        "KEY1=value1\nGOOGLE_REFRESH_TOKEN=old_token\nKEY3=value3",
      );

      updateEnvValue("GOOGLE_REFRESH_TOKEN", "new_token");

      const written = (fs.writeFileSync as Mock).mock.calls[0][1] as string;
      expect(written).toContain("GOOGLE_REFRESH_TOKEN=new_token");
      expect(written).not.toContain("GOOGLE_REFRESH_TOKEN=old_token");
      expect(written).toContain("KEY1=value1");
      expect(written).toContain("KEY3=value3");
    });

    it("should handle CRLF line endings when reading", () => {
      (fs.readFileSync as Mock).mockReturnValue(
        "KEY1=value1\r\nGOOGLE_REFRESH_TOKEN=old_token\r\nKEY3=value3",
      );

      updateEnvValue("GOOGLE_REFRESH_TOKEN", "new_token");

      const written = (fs.writeFileSync as Mock).mock.calls[0][1] as string;
      expect(written).toContain("GOOGLE_REFRESH_TOKEN=new_token");
      expect(written).not.toContain("GOOGLE_REFRESH_TOKEN=old_token");
    });

    it("should always use LF line endings when writing", () => {
      (fs.readFileSync as Mock).mockReturnValue(
        "KEY1=value1\r\nKEY2=value2",
      );

      updateEnvValue("KEY1", "newvalue1");

      const written = (fs.writeFileSync as Mock).mock.calls[0][1] as string;
      expect(written).not.toContain("\r\n");
      expect(written).toContain("\n");
    });
  });
});
