import type { Meta, StoryObj } from "@storybook/html";
import { createLiquidStory } from "../../../.storybook/liquidRenderer";
import template from "./template.liquid?raw";

const meta = {
  title: "Reddit",
  render: createLiquidStory(template),
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
