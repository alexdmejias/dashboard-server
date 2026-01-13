import type { Preview } from "@storybook/html";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    viewport: {
      viewports: {
        dashboard: {
          name: "Dashboard",
          styles: {
            width: "1200px",
            height: "825px",
          },
        },
      },
      defaultViewport: "dashboard",
    },
  },
};

export default preview;
