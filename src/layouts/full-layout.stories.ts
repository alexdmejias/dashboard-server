import type { Meta, StoryObj } from "@storybook/html-vite";
import { createLayoutStoryRenderer } from "../../.storybook/layoutRenderer";
import {
  yearProgressFixture,
  weatherFixture,
  calendarFixture,
} from "../../.storybook/layoutFixtures";

// Full Layout Stories
const meta = {
  title: "Layouts/Full Layout",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: "Full-page layout for displaying a single callback",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const YearProgress: Story = {
  render: createLayoutStoryRenderer("full", [
    { name: "year-progress", data: yearProgressFixture },
  ]),
  parameters: {
    docs: {
      description: {
        story: "Full layout with year progress callback showing the current year's progress",
      },
    },
  },
};

export const Weather: Story = {
  render: createLayoutStoryRenderer("full", [
    { name: "weather", data: weatherFixture },
  ]),
  parameters: {
    docs: {
      description: {
        story: "Full layout with weather callback showing current conditions and forecast",
      },
    },
  },
};

export const Calendar: Story = {
  render: createLayoutStoryRenderer("full", [
    { name: "calendar", data: calendarFixture },
  ]),
  parameters: {
    docs: {
      description: {
        story: "Full layout with calendar callback showing upcoming events",
      },
    },
  },
};
