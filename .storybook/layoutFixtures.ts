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
  title: "Astoria",
  current: {
    temp_f: 22,
  },
  forecast: [
    {
      max: 23,
      low: 2,
      date: "Wed Feb 5",
      condition: {
        text: "Sunny",
        image: "https://cdn.weatherapi.com/weather/64x64/day/113.png",
      },
    },
    {
      max: 23,
      low: 10,
      date: "Thu Feb 6",
      condition: {
        text: "Partly Cloudy",
        image: "https://cdn.weatherapi.com/weather/64x64/day/116.png",
      },
    },
    {
      max: 25,
      low: 12,
      date: "Fri Feb 7",
      condition: {
        text: "Overcast",
        image: "https://cdn.weatherapi.com/weather/64x64/day/122.png",
      },
    },
  ],
};

export const weatherFixtureSF = {
  title: "San Francisco",
  current: {
    temp_f: 22,
  },
  forecast: [
    {
      max: 19,
      low: 11,
      date: "Wed Feb 5",
      condition: {
        text: "Partly cloudy",
        image: "https://cdn.weatherapi.com/weather/64x64/day/116.png",
      },
    },
    {
      max: 17,
      low: 10,
      date: "Thu Feb 6",
      condition: {
        text: "Cloudy",
        image: "https://cdn.weatherapi.com/weather/64x64/day/119.png",
      },
    },
  ],
};

export const weatherFixtureNY = {
  current: {
    temp_f: 22,
  },
  forecast: [
    {
      max: 4,
      low: -3,
      date: "Wed Feb 5",
      condition: {
        text: "Sunny",
        image: "https://cdn.weatherapi.com/weather/64x64/day/113.png",
      },
    },
    {
      max: 6,
      low: -1,
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
