import type { Meta, StoryObj } from "@storybook/html-vite";
import {
  calendarFixture,
  weatherFixture,
  weatherFixtureNY,
  weatherFixtureSF,
  yearProgressFixture,
} from "../../.storybook/layoutFixtures";
import { createLayoutStoryRenderer } from "../../.storybook/layoutRenderer";

// 2-Col Layout Stories
const meta = {
  title: "Layouts/2-Col Layout",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: "Side-by-side layout for displaying two callbacks",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const YearProgressAndWeather: Story = {
  render: createLayoutStoryRenderer("2-col", [
    { name: "year-progress", data: { data: yearProgressFixture } },
    {
      name: "weather",
      data: { runtimeConfig: { title: "wasdwasdwasd" }, data: weatherFixture },
    },
  ]),
  parameters: {
    docs: {
      description: {
        story:
          "2-col layout combining year progress and weather - showing time progress alongside weather forecast",
      },
    },
  },
};

export const WeatherComparison: Story = {
  render: createLayoutStoryRenderer("2-col", [
    { name: "weather", data: { data: weatherFixtureSF } },
    { name: "weather", data: { data: weatherFixtureNY } },
  ]),
  parameters: {
    docs: {
      description: {
        story:
          "2-col layout comparing weather in two different cities (San Francisco and New York)",
      },
    },
  },
};

export const WeatherAndCalendar: Story = {
  render: createLayoutStoryRenderer("2-col", [
    { name: "weather", data: { data: weatherFixture } },
    {
      name: "calendar",
      data: { runtimeConfig: { title: "wasd" }, data: calendarFixture },
    },
  ]),
  parameters: {
    docs: {
      description: {
        story:
          "2-col layout combining weather forecast with calendar events - a typical dashboard view",
      },
    },
  },
};

export const DualYearProgress: Story = {
  render: createLayoutStoryRenderer("2-col", [
    { name: "year-progress", data: { data: yearProgressFixture } },
    { name: "year-progress", data: { data: yearProgressFixture } },
  ]),
  parameters: {
    docs: {
      description: {
        story:
          "2-col layout with two year progress callbacks - useful for comparing different time periods or tracking systems",
      },
    },
  },
};
