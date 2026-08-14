import type { Meta, StoryObj } from "@storybook/html-vite";
import { createLayoutStoryRenderer } from "../../../.storybook/layoutRenderer";

const meta = {
  title: "Weather",
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
        image: "https://cdn.weatherapi.com/weather/64x64/night/116.png",
      },
    },
    forecast: [
      {
        max: 23.5,
        low: 2.1,
        date: "Tue Jan 27",
        condition: {
          text: "Sunny",
          image: "https://cdn.weatherapi.com/weather/64x64/day/113.png",
        },
      },
      {
        max: 23.2,
        low: 10.6,
        date: "Wed Jan 28",
        condition: {
          text: "Partly Cloudy ",
          image: "https://cdn.weatherapi.com/weather/64x64/day/116.png",
        },
      },
    ],
  },
};

export const Default: Story = {
  render: createLayoutStoryRenderer("full", [
    { name: "weather", data: fixtures.default },
  ]),
};
