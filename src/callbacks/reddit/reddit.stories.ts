import type { Meta, StoryObj } from "@storybook/html-vite";
import { createLayoutStoryRenderer } from "../../../.storybook/layoutRenderer";

const meta = {
  title: "Reddit",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const fixtures = {
  default: {
    title: "Reddit Posts",
    data: [
      {
        title: "TIL that octopuses have three hearts",
      },
      {
        title: "New TypeScript 5.0 features announced",
      },
      {
        title: "How to optimize React performance",
      },
    ],
  },
  empty: [],
  singlePost: {
    title: "Reddit Posts",
    data: [
      {
        title: "Single post example",
      },
    ],
  },
  longTitles: {
    title: "Reddit Posts with Long Titles",
    data: [
      {
        title:
          "This is an extremely long post title that goes on and on with lots of information and detail that might cause layout issues if not handled properly in the template",
      },
      {
        title:
          "Another very long title with even more content to test how the UI handles text wrapping and spacing when titles are particularly verbose and detailed",
      },
      {
        title: "Short title for contrast",
      },
    ],
  },
  manyPosts: {
    data: Array.from({ length: 15 }, (_, i) => ({
      title: `Reddit post number ${i + 1} about various interesting topics`,
    })),
  },
};

export const Default: Story = {
  render: createLayoutStoryRenderer("full", [
    { name: "reddit", data: fixtures.default },
  ]),
};

export const Empty: Story = {
  render: createLayoutStoryRenderer("full", [
    { name: "reddit", data: fixtures.empty },
  ]),
};

export const SinglePost: Story = {
  render: createLayoutStoryRenderer("full", [
    { name: "reddit", data: fixtures.singlePost },
  ]),
};

export const LongTitles: Story = {
  render: createLayoutStoryRenderer("full", [
    { name: "reddit", data: fixtures.longTitles },
  ]),
};

export const ManyPosts: Story = {
  render: createLayoutStoryRenderer("full", [
    { name: "reddit", data: fixtures.manyPosts },
  ]),
};
