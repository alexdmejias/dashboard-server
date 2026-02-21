import fs from "node:fs";
import path from "node:path";
import { getEnvPath, updateEnvValue } from "./env";

jest.mock("node:fs", () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true),
}));

describe("env utilities", () => {
  afterEach(() => {
    jest.clearAllMocks();
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
      (fs.readFileSync as jest.Mock).mockReturnValue(
        "KEY1=value1\nGOOGLE_REFRESH_TOKEN=old_token\nKEY3=value3",
      );

      updateEnvValue("GOOGLE_REFRESH_TOKEN", "new_token");

      const written = (fs.writeFileSync as jest.Mock).mock.calls[0][1] as string;
      expect(written).toContain("GOOGLE_REFRESH_TOKEN=new_token");
      expect(written).not.toContain("GOOGLE_REFRESH_TOKEN=old_token");
      expect(written).toContain("KEY1=value1");
      expect(written).toContain("KEY3=value3");
    });

    it("should handle CRLF line endings when reading", () => {
      (fs.readFileSync as jest.Mock).mockReturnValue(
        "KEY1=value1\r\nGOOGLE_REFRESH_TOKEN=old_token\r\nKEY3=value3",
      );

      updateEnvValue("GOOGLE_REFRESH_TOKEN", "new_token");

      const written = (fs.writeFileSync as jest.Mock).mock.calls[0][1] as string;
      expect(written).toContain("GOOGLE_REFRESH_TOKEN=new_token");
      expect(written).not.toContain("GOOGLE_REFRESH_TOKEN=old_token");
    });

    it("should append a new key when it does not exist", () => {
      (fs.readFileSync as jest.Mock).mockReturnValue("KEY1=value1\nKEY2=value2");

      updateEnvValue("NEW_KEY", "new_value");

      const written = (fs.writeFileSync as jest.Mock).mock.calls[0][1] as string;
      expect(written).toContain("NEW_KEY=new_value");
      expect(written).toContain("KEY1=value1");
      expect(written).toContain("KEY2=value2");
    });

    it("should not modify keys that share a common prefix", () => {
      (fs.readFileSync as jest.Mock).mockReturnValue(
        "GOOGLE_REFRESH_TOKEN=old\nGOOGLE_REFRESH_TOKEN_BACKUP=backup",
      );

      updateEnvValue("GOOGLE_REFRESH_TOKEN", "new_token");

      const written = (fs.writeFileSync as jest.Mock).mock.calls[0][1] as string;
      expect(written).toContain("GOOGLE_REFRESH_TOKEN=new_token");
      expect(written).toContain("GOOGLE_REFRESH_TOKEN_BACKUP=backup");
    });

    it("should write back to the same .env file path", () => {
      (fs.readFileSync as jest.Mock).mockReturnValue("KEY=value");

      updateEnvValue("KEY", "updated");

      const writtenPath = (fs.writeFileSync as jest.Mock).mock.calls[0][0] as string;
      expect(writtenPath).toBe(getEnvPath());
    });
  });
});
