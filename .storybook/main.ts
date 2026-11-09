import type { StorybookConfig } from "@storybook/html-vite";

const config: StorybookConfig = {
  stories: [
    "../src/callbacks/**/*.stories.ts",
    "../src/layouts/**/*.stories.ts",
  ],
  addons: [],

  framework: {
    name: "@storybook/html-vite",
    options: {},
  },

  // ./static holds local copies of TRMNL's stylesheet and Inter font, and
  // the weather icons used by fixtures (see trmnlAssets.ts).
  staticDirs: ["../public", "./static"],
};

export default config;
