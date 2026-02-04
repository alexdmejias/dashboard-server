import type { Meta, StoryObj } from "@storybook/html-vite";
import { createLayoutStoryRenderer } from "../../.storybook/layoutRenderer";
import {
  yearProgressFixture,
  weatherFixture,
  weatherFixtureSF,
  weatherFixtureNY,
  calendarFixture,
} from "../../.storybook/layoutFixtures";

// Full Layout Stories
const fullLayoutMeta = {
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

export default fullLayoutMeta;
type FullStory = StoryObj<typeof fullLayoutMeta>;

export const YearProgress: FullStory = {
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

export const Weather: FullStory = {
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

export const Calendar: FullStory = {
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

// 2-Col Layout Stories
const twoColLayoutMeta = {
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

export { twoColLayoutMeta };
type TwoColStory = StoryObj<typeof twoColLayoutMeta>;

export const YearProgressAndWeather: TwoColStory = {
  render: createLayoutStoryRenderer("2-col", [
    { name: "year-progress", data: yearProgressFixture },
    { name: "weather", data: weatherFixture },
  ]),
  parameters: {
    docs: {
      description: {
        story: "2-col layout combining year progress and weather - showing time progress alongside weather forecast",
      },
    },
  },
};

export const WeatherComparison: TwoColStory = {
  render: createLayoutStoryRenderer("2-col", [
    { name: "weather", data: weatherFixtureSF },
    { name: "weather", data: weatherFixtureNY },
  ]),
  parameters: {
    docs: {
      description: {
        story: "2-col layout comparing weather in two different cities (San Francisco and New York)",
      },
    },
  },
};

export const WeatherAndCalendar: TwoColStory = {
  render: createLayoutStoryRenderer("2-col", [
    { name: "weather", data: weatherFixture },
    { name: "calendar", data: calendarFixture },
  ]),
  parameters: {
    docs: {
      description: {
        story: "2-col layout combining weather forecast with calendar events - a typical dashboard view",
      },
    },
  },
};

export const DualYearProgress: TwoColStory = {
  render: createLayoutStoryRenderer("2-col", [
    { name: "year-progress", data: yearProgressFixture },
    { name: "year-progress", data: yearProgressFixture },
  ]),
  parameters: {
    docs: {
      description: {
        story: "2-col layout with two year progress callbacks - useful for comparing different time periods or tracking systems",
      },
    },
  },
};
