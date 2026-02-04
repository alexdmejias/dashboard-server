/**
 * Fixture data for callbacks to use in layout stories
 * This mirrors the data structure that callbacks return from their getData() methods
 */

export const yearProgressFixture = {
  date: "Tue, Feb 4, 2026",
  days: [
    [31, 0], // January - complete
    [4, 24], // February - 4 days complete, 24 remaining
    [0, 31], // March - not started
    [0, 30], // April
    [0, 31], // May
    [0, 30], // June
    [0, 31], // July
    [0, 31], // August
    [0, 30], // September
    [0, 31], // October
    [0, 30], // November
    [0, 31], // December
  ],
};

export const weatherFixture = {
  today: {
    max: 27.9,
    low: 10.2,
    date: "2/4/2026",
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
      date: "Wed Feb 5",
      condition: {
        text: "Sunny",
        image: "https://cdn.weatherapi.com/weather/64x64/day/113.png",
      },
    },
    {
      max: 23.2,
      low: 10.6,
      date: "Thu Feb 6",
      condition: {
        text: "Partly Cloudy",
        image: "https://cdn.weatherapi.com/weather/64x64/day/116.png",
      },
    },
    {
      max: 25.1,
      low: 12.3,
      date: "Fri Feb 7",
      condition: {
        text: "Overcast",
        image: "https://cdn.weatherapi.com/weather/64x64/day/122.png",
      },
    },
  ],
};

export const weatherFixtureSF = {
  today: {
    max: 18.3,
    low: 12.1,
    date: "2/4/2026",
    current: 15.6,
    condition: {
      text: "Foggy",
      image: "https://cdn.weatherapi.com/weather/64x64/day/248.png",
    },
  },
  forecast: [
    {
      max: 19.4,
      low: 11.7,
      date: "Wed Feb 5",
      condition: {
        text: "Partly cloudy",
        image: "https://cdn.weatherapi.com/weather/64x64/day/116.png",
      },
    },
    {
      max: 17.8,
      low: 10.9,
      date: "Thu Feb 6",
      condition: {
        text: "Cloudy",
        image: "https://cdn.weatherapi.com/weather/64x64/day/119.png",
      },
    },
  ],
};

export const weatherFixtureNY = {
  today: {
    max: 5.6,
    low: -2.1,
    date: "2/4/2026",
    current: 2.3,
    condition: {
      text: "Light snow",
      image: "https://cdn.weatherapi.com/weather/64x64/day/326.png",
    },
  },
  forecast: [
    {
      max: 4.2,
      low: -3.8,
      date: "Wed Feb 5",
      condition: {
        text: "Sunny",
        image: "https://cdn.weatherapi.com/weather/64x64/day/113.png",
      },
    },
    {
      max: 6.1,
      low: -1.2,
      date: "Thu Feb 6",
      condition: {
        text: "Partly Cloudy",
        image: "https://cdn.weatherapi.com/weather/64x64/day/116.png",
      },
    },
  ],
};

export const calendarFixture = {
  title: "Calendar",
  days: [
    {
      date: "Tue 2/4",
      events: [
        {
          title: "Team Standup",
          time: "9:00 AM",
          category: "morning",
        },
        {
          title: "Code Review",
          time: "2:00 PM",
          category: "afternoon",
        },
      ],
      eventsByCategory: {
        allDay: [],
        morning: [{ title: "Team Standup", time: "9:00 AM" }],
        afternoon: [{ title: "Code Review", time: "2:00 PM" }],
        evening: [],
        night: [],
      },
    },
    {
      date: "Wed 2/5",
      events: [
        {
          title: "All Hands Meeting",
          time: "10:00 AM",
          category: "morning",
        },
        {
          title: "Sprint Planning",
          time: "3:00 PM",
          category: "afternoon",
        },
      ],
      eventsByCategory: {
        allDay: [],
        morning: [{ title: "All Hands Meeting", time: "10:00 AM" }],
        afternoon: [{ title: "Sprint Planning", time: "3:00 PM" }],
        evening: [],
        night: [],
      },
    },
    {
      date: "Thu 2/6",
      events: [
        {
          title: "1:1 with Manager",
          time: "11:00 AM",
          category: "morning",
        },
      ],
      eventsByCategory: {
        allDay: [],
        morning: [{ title: "1:1 with Manager", time: "11:00 AM" }],
        afternoon: [],
        evening: [],
        night: [],
      },
    },
  ],
};

export const calendarEmptyFixture = {
  title: "Calendar",
  days: [
    {
      date: "Sat 2/8",
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
      date: "Sun 2/9",
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
};
