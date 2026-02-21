import CallbackCalendar from "./index";
import type { GoogleCalendarEvent } from "./types";

// Mock the Google APIs
jest.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        setCredentials: jest.fn(),
        on: jest.fn(),
        credentials: {},
      })),
    },
    calendar: jest.fn().mockReturnValue({
      events: {
        list: jest.fn().mockResolvedValue({
          data: { items: [] },
        }),
      },
    }),
  },
}));

describe("CallbackCalendar", () => {
  let callback: CallbackCalendar;

  beforeEach(() => {
    // Set up required environment variables
    process.env.GOOGLE_CLIENT_ID = "test-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
    process.env.GOOGLE_REFRESH_TOKEN = "test-refresh-token";

    callback = new CallbackCalendar({
      calendarId: "primary",
      maxEventsPerDay: 5,
      daysToFetch: 7,
    });
  });

  afterEach(() => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_REFRESH_TOKEN;
  });

  describe("timezone handling", () => {
    it("should parse all-day events as calendar days", () => {
      // Access private method for testing via type assertion
      const parseDate = (callback as any).parseDate.bind(callback);
      
      const date = parseDate("2026-01-20");
      
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(0); // January is 0
      expect(date.getDate()).toBe(20);
      expect(date.getHours()).toBe(0);
      expect(date.getMinutes()).toBe(0);
      expect(date.getSeconds()).toBe(0);
    });

    it("should get current date at midnight in the configured timezone", () => {
      const getNowInTimezone = (callback as any).getNowInTimezone.bind(callback);
      
      const now = getNowInTimezone('America/New_York');
      
      expect(now.getHours()).toBe(0);
      expect(now.getMinutes()).toBe(0);
      expect(now.getSeconds()).toBe(0);
      expect(now.getMilliseconds()).toBe(0);
    });

    it("should parse dates consistently regardless of server timezone", () => {
      const originalTZ = process.env.TZ;

      try {
        const parseDate = (callback as any).parseDate.bind(callback);
        
        // Test with UTC timezone
        process.env.TZ = "UTC";
        const dateUTC = parseDate("2026-01-20");

        // Test with Asia/Tokyo timezone (UTC+9)
        process.env.TZ = "Asia/Tokyo";
        const dateTokyo = parseDate("2026-01-20");

        // Both should parse to the same date
        expect(dateUTC.getFullYear()).toBe(dateTokyo.getFullYear());
        expect(dateUTC.getMonth()).toBe(dateTokyo.getMonth());
        expect(dateUTC.getDate()).toBe(dateTokyo.getDate());
        expect(dateUTC.getTime()).toBe(dateTokyo.getTime());
      } finally {
        if (originalTZ !== undefined) {
          process.env.TZ = originalTZ;
        } else {
          delete process.env.TZ;
        }
      }
    });

    it("should support configurable timezone", () => {
      const getNowInTimezone = (callback as any).getNowInTimezone.bind(callback);
      
      // Get current date in different timezones
      const nyNow = getNowInTimezone('America/New_York');
      const tokyoNow = getNowInTimezone('Asia/Tokyo');
      const londonNow = getNowInTimezone('Europe/London');
      
      // All should be valid dates
      expect(nyNow).toBeInstanceOf(Date);
      expect(tokyoNow).toBeInstanceOf(Date);
      expect(londonNow).toBeInstanceOf(Date);
      
      // All should have midnight times
      expect(nyNow.getHours()).toBe(0);
      expect(tokyoNow.getHours()).toBe(0);
      expect(londonNow.getHours()).toBe(0);
    });

    it("should handle all-day events correctly when server is in UTC", () => {
      const originalTZ = process.env.TZ;

      try {
        process.env.TZ = "UTC";
        
        const getEventStart = (callback as any).getEventStart.bind(callback);
        
        // All-day event for Tuesday, January 20, 2026
        const allDayEvent: GoogleCalendarEvent = {
          summary: "All Day Event",
          start: { date: "2026-01-20" },
          end: { date: "2026-01-21" },
        };

        const startDate = getEventStart(allDayEvent);
        
        // Should be January 20, 2026 at midnight
        expect(startDate.getFullYear()).toBe(2026);
        expect(startDate.getMonth()).toBe(0); // January
        expect(startDate.getDate()).toBe(20);
        expect(startDate.getHours()).toBe(0);
      } finally {
        if (originalTZ !== undefined) {
          process.env.TZ = originalTZ;
        } else {
          delete process.env.TZ;
        }
      }
    });

    it("should handle timed events normally without timezone conversion", () => {
      const getEventStart = (callback as any).getEventStart.bind(callback);
      
      // Timed event with dateTime
      const timedEvent: GoogleCalendarEvent = {
        summary: "Timed Event",
        start: { dateTime: "2026-01-20T14:00:00-05:00" },
        end: { dateTime: "2026-01-20T15:00:00-05:00" },
      };

      const startDate = getEventStart(timedEvent);
      
      // Should parse the ISO string normally
      expect(startDate.toISOString()).toBe(new Date("2026-01-20T14:00:00-05:00").toISOString());
    });
  });

  describe("event categorization", () => {
    it("should categorize all-day events correctly", () => {
      const isAllDayEvent = (callback as any).isAllDayEvent.bind(callback);
      const categorizeEventByTime = (callback as any).categorizeEventByTime.bind(callback);

      const allDayEvent: GoogleCalendarEvent = {
        summary: "All Day Event",
        start: { date: "2026-01-20" },
        end: { date: "2026-01-21" },
      };

      expect(isAllDayEvent(allDayEvent)).toBe(true);
      expect(categorizeEventByTime(allDayEvent, true)).toBe("allDay");
    });

    it("should categorize timed events as not all-day", () => {
      const isAllDayEvent = (callback as any).isAllDayEvent.bind(callback);

      const timedEvent: GoogleCalendarEvent = {
        summary: "Timed Event",
        start: { dateTime: "2026-01-20T14:00:00-05:00" },
        end: { dateTime: "2026-01-20T15:00:00-05:00" },
      };

      expect(isAllDayEvent(timedEvent)).toBe(false);
    });
  });

  describe("transformEvents", () => {
    it("should place all-day events on the correct day", () => {
      const transformEvents = (callback as any).transformEvents.bind(callback);
      const getNowInTimezone = (callback as any).getNowInTimezone.bind(callback);
      
      // Get today's date in New York
      const today = getNowInTimezone('America/New_York');
      const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      // All-day event for today
      const events: GoogleCalendarEvent[] = [
        {
          summary: "All Day Event Today",
          start: { date: todayStr },
          end: { date: tomorrowStr },
        },
      ];

      const config = {
        calendarId: ["primary"],
        maxEventsPerDay: 5,
        daysToFetch: 7,
        timezone: "America/New_York",
      };

      const result = transformEvents(events, config);

      // The event should appear on day 0 (today)
      expect(result.days[0].events.length).toBe(1);
      expect(result.days[0].events[0].title).toBe("All Day Event Today");
    });

    it("should use configured timezone for day calculations", () => {
      const transformEvents = (callback as any).transformEvents.bind(callback);
      const getNowInTimezone = (callback as any).getNowInTimezone.bind(callback);
      
      // Get today's date in Tokyo timezone
      const today = getNowInTimezone('Asia/Tokyo');
      const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      // All-day event for today
      const events: GoogleCalendarEvent[] = [
        {
          summary: "All Day Event Tokyo",
          start: { date: todayStr },
          end: { date: tomorrowStr },
        },
      ];

      const config = {
        calendarId: ["primary"],
        maxEventsPerDay: 5,
        daysToFetch: 7,
        timezone: "Asia/Tokyo",
      };

      const result = transformEvents(events, config);

      // The event should appear on day 0 (today in Tokyo time)
      expect(result.days[0].events.length).toBe(1);
      expect(result.days[0].events[0].title).toBe("All Day Event Tokyo");
    });
  });

  describe("date formatting", () => {
    it("should format dates correctly", () => {
      const formatDate = (callback as any).formatDate.bind(callback);
      
      const date = new Date(2026, 0, 20); // January 20, 2026 (Tuesday)
      const formatted = formatDate(date);
      
      expect(formatted).toContain("1/20");
      expect(formatted).toContain("Tue");
    });
  });
});
