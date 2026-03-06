import type { Meta, StoryObj } from "@storybook/html-vite";
import { createLiquidStory } from "../../../.storybook/liquidRenderer";

import template from "./template.liquid?raw";

const meta = {
  title: "Calendar",
  render: createLiquidStory(template),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const fixtures = {
  default: {
    title: "Calendar",
    days: [
      {
        date: "Thu 1/29",
        events: [],
        eventsByCategory: {
          allDay: [],
          morning: [],
          afternoon: [],
          evening: [],
          night: [],
        },
      },
      {
        date: "Fri 1/30",
        events: [],
        eventsByCategory: {
          allDay: [],
          morning: [],
          afternoon: [],
          evening: [],
          night: [],
        },
      },
      {
        date: "Sat 1/31",
        events: [],
        eventsByCategory: {
          allDay: [],
          morning: [],
          afternoon: [],
          evening: [],
          night: [],
        },
      },
      {
        date: "Sun 2/1",
        events: [
          {
            title: "Frick Museum (Culture Pass)",
            start: "4:00",
            end: "6:00",
            allDay: false,
            category: "afternoon",
          },
        ],
        eventsByCategory: {
          allDay: [],
          morning: [],
          afternoon: [
            {
              title: "Frick Museum (Culture Pass)",
              start: "4:00",
              end: "6:00",
              allDay: false,
              category: "afternoon",
            },
          ],
          evening: [],
          night: [],
        },
      },
      {
        date: "Mon 2/2",
        events: [
          {
            title: "Chase Bill",
            start: "Mon 2/2",
            end: "Mon 2/2",
            allDay: true,
            category: "allDay",
          },
        ],
        eventsByCategory: {
          allDay: [
            {
              title: "Chase Bill",
              start: "Mon 2/2",
              end: "Mon 2/2",
              allDay: true,
              category: "allDay",
            },
          ],
          morning: [],
          afternoon: [],
          evening: [],
          night: [],
        },
      },
      {
        date: "Tue 2/3",
        events: [],
        eventsByCategory: {
          allDay: [],
          morning: [],
          afternoon: [],
          evening: [],
          night: [],
        },
      },
      {
        date: "Wed 2/4",
        events: [],
        eventsByCategory: {
          allDay: [],
          morning: [],
          afternoon: [],
          evening: [],
          night: [],
        },
      },
    ],
  },
};

export const Default: Story = {
  args: {
    data: fixtures.default,
  },
};
