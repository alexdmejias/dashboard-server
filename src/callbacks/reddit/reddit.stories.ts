import type { Meta, StoryObj } from "@storybook/html";
import { createLiquidStory } from "../../../.storybook/liquidRenderer";
import footer from "../../../views/partials/footer.liquid?raw";
import head from "../../../views/partials/head.liquid?raw";

import template from "./template.liquid?raw";

const meta = {
  title: "Reddit",
  render: createLiquidStory(head + template + footer),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    data: {
      title: "This is a tesasdt",
      data: [
        { title: "some really long title" },
        { title: "wasd" },
        { title: "wasd" },
        { title: "wasd" },
      ],
    },
  },
};
