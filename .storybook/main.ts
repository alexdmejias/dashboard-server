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

  staticDirs: ["../public"],
};

export default config;
