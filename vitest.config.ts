import path from "node:path";
import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          globals: true,
          include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
        },
      },
      {
        // Visual regression tests: every Storybook story is screenshotted and
        // compared with the reference in the story's __screenshots__ folder.
        // References must come from the Playwright Docker image, see
        // `npm run test:visual:update`.
        plugins: [
          storybookTest({ configDir: path.join(dirname, ".storybook") }),
        ],
        test: {
          name: "visual",
          setupFiles: ["./.storybook/vitest.setup.ts"],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({
              launchOptions: { executablePath: process.env.CHROMIUM_BIN },
              // Keep the page larger than the test frame, or Vitest scales the
              // frame (and so the screenshots) down to fit.
              contextOptions: { viewport: { width: 1400, height: 1000 } },
            }),
            viewport: { width: 1300, height: 900 },
            instances: [{ browser: "chromium" }],
            expect: {
              toMatchScreenshot: {
                comparatorName: "pixelmatch",
                // Tolerates anti-aliasing noise, not a moved element.
                comparatorOptions: { allowedMismatchedPixelRatio: 0.001 },
              },
            },
          },
        },
      },
    ],
  },
});
