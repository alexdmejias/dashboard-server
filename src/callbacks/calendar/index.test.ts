import { _resetForTesting, initSettings, updateSettings } from "../../settings";
import CallbackCalendar from "./index";
import type { GoogleCalendarEvent } from "./types";

// Mock the env utility to avoid touching the real .env file in tests
jest.mock("../../utils/env", () => ({
  updateEnvValue: jest.fn(),
}));

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

  beforeEach(async () => {
    _resetForTesting();
    await initSettings();
    await updateSettings({
      googleClientId: "test-client-id",
      googleClientSecret: "test-client-secret",
      googleRefreshToken: "test-refresh-token",
    });

    callback = new CallbackCalendar({
      calendarId: "primary",
      maxEventsPerDay: 5,
      daysToFetch: 7,
    });
  });

  afterEach(() => {
    _resetForTesting();
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
      const getNowInTimezone = (callback as any).getNowInTimezone.bind(
        callback,
      );

      const now = getNowInTimezone("America/New_York");

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
      const getNowInTimezone = (callback as any).getNowInTimezone.bind(
        callback,
      );

      // Get current date in different timezones
      const nyNow = getNowInTimezone("America/New_York");
      const tokyoNow = getNowInTimezone("Asia/Tokyo");
      const londonNow = getNowInTimezone("Europe/London");

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
      expect(startDate.toISOString()).toBe(
        new Date("2026-01-20T14:00:00-05:00").toISOString(),
      );
    });
  });

  describe("event categorization", () => {
    it("should categorize all-day events correctly", () => {
      const isAllDayEvent = (callback as any).isAllDayEvent.bind(callback);
      const categorizeEventByTime = (
        callback as any
      ).categorizeEventByTime.bind(callback);

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
      const getNowInTimezone = (callback as any).getNowInTimezone.bind(
        callback,
      );

      // Get today's date in New York
      const today = getNowInTimezone("America/New_York");
      const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD format
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];

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
      const getNowInTimezone = (callback as any).getNowInTimezone.bind(
        callback,
      );

      // Get today's date in Tokyo timezone
      const today = getNowInTimezone("Asia/Tokyo");
      const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD format
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];

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

  describe("auth client", () => {
    let originalRefreshToken: string | undefined;

    beforeEach(() => {
      originalRefreshToken = process.env.GOOGLE_REFRESH_TOKEN;
      jest.clearAllMocks();
    });

    afterEach(() => {
      process.env.GOOGLE_REFRESH_TOKEN = originalRefreshToken;
    });

    it("should register a tokens event listener for observing token refreshes", async () => {
      const { google } = require("googleapis");
      const mockOn = jest.fn();
      google.auth.OAuth2.mockImplementation(() => ({
        setCredentials: jest.fn(),
        on: mockOn,
        credentials: {},
      }));

      const getAuthClient = (callback as any).getAuthClient.bind(callback);
      // Reset cached promise so a new client is created with our mock
      (callback as any).authClientPromise = null;
      await getAuthClient();

      expect(mockOn).toHaveBeenCalledWith("tokens", expect.any(Function));
    });

    it("should handle refresh token rotation: re-apply new refresh token, update env and persist to .env", async () => {
      const { google } = require("googleapis");
      const { updateEnvValue } = require("../../utils/env");

      let capturedTokensHandler: ((tokens: any) => void) | null = null;
      let mockCredentials: Record<string, any> = {
        refresh_token: "old-refresh-token",
      };
      const mockSetCredentials = jest.fn((creds) => {
        mockCredentials = { ...mockCredentials, ...creds };
      });

      google.auth.OAuth2.mockImplementation(() => {
        const client = {
          setCredentials: mockSetCredentials,
          on: (_event: string, handler: (tokens: any) => void) => {
            capturedTokensHandler = handler;
          },
          get credentials() {
            return mockCredentials;
          },
        };
        return client;
      });

      const getAuthClient = (callback as any).getAuthClient.bind(callback);
      (callback as any).authClientPromise = null;
      await getAuthClient();

      expect(capturedTokensHandler).not.toBeNull();

      // Simulate Google issuing a new refresh token
      capturedTokensHandler!({ refresh_token: "new-refresh-token" });

      // process.env should be updated immediately
      expect(process.env.GOOGLE_REFRESH_TOKEN).toBe("new-refresh-token");

      // updateEnvValue should be called to persist the new token to .env
      expect(updateEnvValue).toHaveBeenCalledWith(
        "GOOGLE_REFRESH_TOKEN",
        "new-refresh-token",
      );

      // The setImmediate callback re-applies the new refresh token
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(mockSetCredentials).toHaveBeenLastCalledWith(
        expect.objectContaining({ refresh_token: "new-refresh-token" }),
      );
    });

    it("should not call updateEnvValue when access token is refreshed without rotation", async () => {
      const { google } = require("googleapis");
      const { updateEnvValue } = require("../../utils/env");

      let capturedTokensHandler: ((tokens: any) => void) | null = null;
      google.auth.OAuth2.mockImplementation(() => ({
        setCredentials: jest.fn(),
        on: (_event: string, handler: (tokens: any) => void) => {
          capturedTokensHandler = handler;
        },
        credentials: { refresh_token: "existing-refresh-token" },
      }));

      const getAuthClient = (callback as any).getAuthClient.bind(callback);
      (callback as any).authClientPromise = null;
      await getAuthClient();

      // Simulate normal access token refresh (no new refresh token)
      capturedTokensHandler!({ access_token: "new-access-token" });

      // process.env should NOT change
      expect(process.env.GOOGLE_REFRESH_TOKEN).toBe(originalRefreshToken);
      // updateEnvValue should NOT be called
      expect(updateEnvValue).not.toHaveBeenCalled();
    });
  });
});
