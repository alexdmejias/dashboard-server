import type { Meta, StoryObj } from "@storybook/html-vite";
import { createLiquidStory } from "../../../.storybook/liquidRenderer";

import template from "./template.liquid?raw";

const meta = {
  title: "Weather",
  render: createLiquidStory(template),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const fixtures = {
  default: {
    today: {
      max: 27.9,
      low: 10.2,
      date: "1/25/2026",
      current: 21.9,
      condition: {
        text: "Partly cloudy",
        image: "http://cdn.weatherapi.com/weather/64x64/night/116.png",
      },
    },
    forecast: [
      {
        max: 23.5,
        low: 2.1,
        date: "Tue Jan 27",
        condition: {
          text: "Sunny",
          image: "http://cdn.weatherapi.com/weather/64x64/day/113.png",
        },
      },
      {
        max: 23.2,
        low: 10.6,
        date: "Wed Jan 28",
        condition: {
          text: "Partly Cloudy ",
          image: "http://cdn.weatherapi.com/weather/64x64/day/116.png",
        },
      },
    ],
  },
};

export const Default: Story = { args: { data: fixtures.default } };
