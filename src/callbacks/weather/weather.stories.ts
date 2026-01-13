import {
  createCallbackMeta,
  createInteractiveStory,
  createLiveStory,
  createSampleStory,
} from "../../storybook/story-helpers";
import CallbackWeather from "./index";

// Co-located fixtures
const fixtures = {
  default: {
    today: {
      current: 72,
      max: 78,
      low: 65,
      date: "12/15/2024",
      condition: {
        text: "Partly cloudy",
        image: "http://cdn.weatherapi.com/weather/64x64/day/116.png",
      },
    },
    forecast: [
      {
        max: 75,
        low: 63,
        date: "Mon Dec 16",
        condition: {
          text: "Sunny",
          image: "http://cdn.weatherapi.com/weather/64x64/day/113.png",
        },
      },
      {
        max: 80,
        low: 68,
        date: "Tue Dec 17",
        condition: {
          text: "Clear",
          image: "http://cdn.weatherapi.com/weather/64x64/day/113.png",
        },
      },
    ],
  },
  extremeCold: {
    today: {
      current: -15,
      max: -8,
      low: -22,
      date: "1/10/2024",
      condition: {
        text: "Heavy snow",
        image: "http://cdn.weatherapi.com/weather/64x64/day/338.png",
      },
    },
    forecast: [
      {
        max: -5,
        low: -18,
        date: "Thu Jan 11",
        condition: {
          text: "Blizzard",
          image: "http://cdn.weatherapi.com/weather/64x64/day/230.png",
        },
      },
      {
        max: -2,
        low: -15,
        date: "Fri Jan 12",
        condition: {
          text: "Moderate snow",
          image: "http://cdn.weatherapi.com/weather/64x64/day/332.png",
        },
      },
    ],
  },
  extremeHeat: {
    today: {
      current: 115,
      max: 118,
      low: 98,
      date: "7/20/2024",
      condition: {
        text: "Sunny",
        image: "http://cdn.weatherapi.com/weather/64x64/day/113.png",
      },
    },
    forecast: [
      {
        max: 120,
        low: 100,
        date: "Sat Jul 21",
        condition: {
          text: "Clear",
          image: "http://cdn.weatherapi.com/weather/64x64/day/113.png",
        },
      },
      {
        max: 119,
        low: 99,
        date: "Sun Jul 22",
        condition: {
          text: "Sunny",
          image: "http://cdn.weatherapi.com/weather/64x64/day/113.png",
        },
      },
    ],
  },
};

const config = {
  CallbackClass: CallbackWeather,
  title: "Callbacks/Weather",
  callbackPath: __dirname,
};

export default createCallbackMeta(config);

export const Default = createSampleStory(config, fixtures.default);

export const ExtremeCold = createSampleStory(config, fixtures.extremeCold);

export const ExtremeHeat = createSampleStory(config, fixtures.extremeHeat);

export const LiveData = createLiveStory(config, { zipcode: "10001" });

export const Interactive = createInteractiveStory(
  config,
  {
    current: {
      control: { type: "number" },
      defaultValue: 72,
    },
    low: {
      control: { type: "number" },
      defaultValue: 65,
    },
    high: {
      control: { type: "number" },
      defaultValue: 78,
    },
    condition: {
      control: { type: "select" },
      options: [
        "Sunny",
        "Partly cloudy",
        "Cloudy",
        "Rainy",
        "Snowy",
        "Stormy",
      ],
      defaultValue: "Partly cloudy",
    },
  },
  (args) => ({
    today: {
      current: args.current,
      max: args.high,
      low: args.low,
      date: new Date().toLocaleDateString(),
      condition: {
        text: args.condition,
        image: "http://cdn.weatherapi.com/weather/64x64/day/116.png",
      },
    },
    forecast: [
      {
        max: args.high + 3,
        low: args.low - 2,
        date: "Tomorrow",
        condition: {
          text: "Sunny",
          image: "http://cdn.weatherapi.com/weather/64x64/day/113.png",
        },
      },
      {
        max: args.high + 5,
        low: args.low,
        date: "Day after",
        condition: {
          text: "Clear",
          image: "http://cdn.weatherapi.com/weather/64x64/day/113.png",
        },
      },
    ],
  }),
);
