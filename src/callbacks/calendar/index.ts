import { google } from "googleapis";
import { z } from "zod/v4";
import type { OAuth2Client } from "google-auth-library";
import CallbackBase from "../../base-callbacks/base";
import type { GoogleCalendarEvent } from "./types";

type CalendarEvent = {
  title: string;
  start: string; // ISO date string
  end: string; // ISO date string
  allDay: boolean;
  category: "allDay" | "morning" | "afternoon" | "evening" | "night";
};

type EventsByCategory = {
  allDay: CalendarEvent[];
  morning: CalendarEvent[];
  afternoon: CalendarEvent[];
  evening: CalendarEvent[];
  night: CalendarEvent[];
};

type DayEvents = {
  date: string; // formatted date string (e.g., "Mon Jan 5")
  events: CalendarEvent[];
  eventsByCategory: EventsByCategory;
};

type CalendarData = {
  days: DayEvents[]; // configurable window starting from today
};

export const expectedConfig = z.object({
  calendarId: z
    .union([z.string(), z.array(z.string())])
    .default("primary")
    .transform((val) => (Array.isArray(val) ? val : [val])),
  maxEventsPerDay: z.number().default(5),
  daysToFetch: z.number().int().min(1).max(30).default(7),
  title: z.string().optional(),
  timezone: z.string().default("America/New_York"),
});

type ConfigType = z.infer<typeof expectedConfig>;

class CallbackCalendar extends CallbackBase<
  CalendarData,
  typeof expectedConfig
> {
  private authClientPromise: Promise<OAuth2Client> | null = null;

  static defaultOptions: ConfigType = {
    calendarId: ["primary"],
    maxEventsPerDay: 5,
    daysToFetch: 7,
    title: "Weekly Calendar",
    timezone: "America/New_York",
  };

  constructor(options = {}) {
    super({
      name: "calendar",
      expectedConfig,
      envVariablesNeeded: [
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET",
        "GOOGLE_REFRESH_TOKEN",
      ],
      receivedConfig: options,
    });
  }

  /**
   * Creates OAuth2 client with refresh token for authentication.
   * The client is created once and reused to prevent duplicate instances.
   */
  private async getAuthClient() {
    if (!this.authClientPromise) {
      this.authClientPromise = this.createAuthClient();
    }
    return this.authClientPromise;
  }

  /**
   * Internal method to create and configure the OAuth2 client.
   *
   * The library automatically refreshes the access token using the refresh_token
   * whenever it expires and stores the new access token in oauth2Client.credentials
   * (in-memory). This is sufficient for access tokens because they can always be
   * regenerated from the refresh_token on the next request or server restart.
   *
   * However, the library has a quirk: if Google rotates the refresh_token, the
   * refreshAccessTokenAsync() method overwrites the new refresh_token with the old
   * one before persisting to credentials. The "tokens" event fires before this
   * overwrite, so we capture the new value there and re-apply it via setImmediate
   * (which runs after the library's synchronous post-await code). We also update
   * process.env.GOOGLE_REFRESH_TOKEN so that any future createAuthClient() call
   * uses the new value.
   */
  private async createAuthClient() {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      "https://developers.google.com/oauthplayground",
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    oauth2Client.on("tokens", (tokens) => {
      if (tokens.refresh_token) {
        // Capture the new refresh_token value before the library mutates the object
        const newRefreshToken = tokens.refresh_token;
        // Re-apply after the library's synchronous overwrite in refreshAccessTokenAsync()
        setImmediate(() => {
          oauth2Client.setCredentials({
            ...oauth2Client.credentials,
            refresh_token: newRefreshToken,
          });
        });
        // Update env so any future createAuthClient() call uses the new refresh token
        process.env.GOOGLE_REFRESH_TOKEN = newRefreshToken;
        this.logger.warn(
          "Google issued a new refresh token. Update GOOGLE_REFRESH_TOKEN in .env to persist it across restarts.",
        );
      } else {
        this.logger.debug("Access token refreshed");
      }
    });

    return oauth2Client;
  }

  /**
   * Fetches calendar events from a single calendar within the specified time range
   */
  async getCalendarEventsFromSingle(
    calendarId: string,
    now: Date,
    endDate: Date,
    maxResults: number,
  ) {
    const auth = await this.getAuthClient();
    const calendar = google.calendar({ version: "v3", auth });

    this.logger.debug(
      {
        calendarId,
        timeMin: now.toISOString(),
        timeMax: endDate.toISOString(),
      },
      "Fetching calendar events from single calendar",
    );

    const response = await calendar.events.list({
      calendarId,
      timeMin: now.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults,
    });

    return response.data.items || [];
  }

  /**
   * Fetches calendar events for the configured range from multiple calendars
   */
  async getCalendarEvents(config: ConfigType) {
    try {
      const now = new Date();
      const endDate = new Date();
      endDate.setDate(now.getDate() + config.daysToFetch);

      // Calculate per-calendar limit to avoid fetching too many events
      // Divide total capacity by number of calendars for more efficient fetching
      const calendarIds = Array.isArray(config.calendarId)
        ? config.calendarId
        : [config.calendarId];
      const totalCapacity = config.maxEventsPerDay * config.daysToFetch;
      // Use ceil to ensure we get enough events even with uneven distribution
      // Note: May fetch slightly more than totalCapacity across all calendars
      const perCalendarLimit = Math.ceil(totalCapacity / calendarIds.length);

      // Fetch events from all calendars in parallel
      const eventPromises = calendarIds.map((calendarId) =>
        this.getCalendarEventsFromSingle(
          calendarId,
          now,
          endDate,
          perCalendarLimit,
        ),
      );

      const eventArrays = await Promise.all(eventPromises);

      // Flatten all events into a single array
      const allEvents = eventArrays.flat();

      // Sort by start time using Date objects for accurate comparison
      // Handles both all-day (date) and timed (dateTime) events correctly
      allEvents.sort((a, b) => {
        const aStartStr = a.start?.dateTime || a.start?.date;
        const bStartStr = b.start?.dateTime || b.start?.date;

        // Move events with missing start times to the end
        if (!aStartStr && !bStartStr) return 0;
        if (!aStartStr) return 1;
        if (!bStartStr) return -1;

        const aDate = new Date(aStartStr);
        const bDate = new Date(bStartStr);
        return aDate.getTime() - bDate.getTime();
      });

      this.logger.debug(
        {
          calendarIds,
          totalEvents: allEvents.length,
        },
        "Fetched events from all calendars",
      );

      return allEvents;
    } catch (error) {
      this.logger.error({ error }, "Failed to fetch calendar events");
      throw error;
    }
  }

  /**
   * Get current date at midnight in the specified timezone
   * 
   * This method extracts the current calendar day in the specified timezone and creates
   * a Date object representing midnight of that day. The Date object itself is in
   * the local timezone, but represents the correct calendar day from the target timezone's perspective.
   * This is used for date arithmetic to calculate day differences.
   */
  private getNowInTimezone(timezone: string): Date {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
    
    const parts = formatter.formatToParts(new Date());
    const year = parseInt(parts.find(p => p.type === 'year')!.value);
    const month = parseInt(parts.find(p => p.type === 'month')!.value) - 1; // 0-indexed
    const day = parseInt(parts.find(p => p.type === 'day')!.value);
    
    // Create date at midnight for the calendar day in the specified timezone
    // Note: The Date object is in local timezone but represents the target timezone's calendar day
    const date = new Date(year, month, day, 0, 0, 0, 0);
    return date;
  }

  /**
   * Parse a date string (YYYY-MM-DD) as a calendar day
   * 
   * For all-day events, Google Calendar provides dates in YYYY-MM-DD format without
   * timezone information. This method parses such dates as calendar days, which is
   * appropriate for all-day events. 
   * 
   * The resulting Date object is created in the local timezone at midnight for the 
   * specified calendar day. It is used only for date arithmetic (calculating which 
   * day slot the event belongs to) in conjunction with getNowInTimezone(), ensuring 
   * consistent day-based comparisons.
   */
  private parseDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    // Create date at midnight for the calendar day, month is 0-indexed
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  /**
   * Format date as "Mon Jan 5"
   */
  private formatDate(date: Date): string {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return `${days[date.getDay()]} ${date.getMonth() + 1}/${date.getDate()}`;
  }

  /**
   * Format time as "9:00 AM"
   */
  private formatTime(date: Date): string {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
    return `${hours}:${minutesStr}`;
  }

  /**
   * Check if event is all-day
   */
  private isAllDayEvent(event: GoogleCalendarEvent): boolean {
    // All-day events have 'date' instead of 'dateTime'
    return !!(event.start?.date && !event.start?.dateTime);
  }

  /**
   * Get start date for an event
   */
  private getEventStart(event: GoogleCalendarEvent): Date {
    const startStr = event.start?.dateTime || event.start?.date;
    if (!startStr) {
      throw new Error("Event has no start date");
    }
    
    // For all-day events, parse as calendar day
    if (event.start?.date && !event.start?.dateTime) {
      return this.parseDate(startStr);
    }
    
    return new Date(startStr);
  }

  /**
   * Categorize event by time of day based on start time
   * Morning: 5:00 AM - 11:59 AM
   * Afternoon: 12:00 PM - 4:59 PM
   * Evening: 5:00 PM - 8:59 PM
   * Night: 9:00 PM - 4:59 AM
   */
  private categorizeEventByTime(
    event: GoogleCalendarEvent,
    isAllDay: boolean,
  ): CalendarEvent["category"] {
    if (isAllDay) {
      return "allDay";
    }

    const startDate = this.getEventStart(event);
    const hour = startDate.getHours();

    if (hour >= 5 && hour < 12) {
      return "morning";
    }
    if (hour >= 12 && hour < 17) {
      return "afternoon";
    }
    if (hour >= 17 && hour < 21) {
      return "evening";
    }
    return "night";
  }

  /**
   * Transform Google Calendar API response to our data structure
   */
  private transformEvents(
    events: GoogleCalendarEvent[],
    config: ConfigType,
  ): CalendarData {
    const daysToFetch = config.daysToFetch;

    // Create array of the configured window of days
    const days: DayEvents[] = [];
    const now = this.getNowInTimezone(config.timezone);
    const MS_PER_DAY = 1000 * 60 * 60 * 24;

    for (let i = 0; i < daysToFetch; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() + i);

      days.push({
        date: this.formatDate(date),
        events: [],
        eventsByCategory: {
          allDay: [],
          morning: [],
          afternoon: [],
          evening: [],
          night: [],
        },
      });
    }

    // Group events by day
    for (const event of events) {
      const startDate = this.getEventStart(event);
      const startDay = new Date(startDate);
      startDay.setHours(0, 0, 0, 0);

      // Find which day this event belongs to
      const dayIndex = Math.floor(
        (startDay.getTime() - now.getTime()) / MS_PER_DAY,
      );

      if (dayIndex >= 0 && dayIndex < daysToFetch) {
        const isAllDay = this.isAllDayEvent(event);
        const endStr = event.end?.dateTime || event.end?.date;
        if (!endStr) {
          continue; // Skip events without end dates
        }
        const endDate = new Date(endStr);

        // Format start/end for display
        let startFormatted: string;
        let endFormatted: string;

        if (isAllDay) {
          startFormatted = this.formatDate(startDate);
          endFormatted = this.formatDate(endDate);
        } else {
          startFormatted = this.formatTime(startDate);
          endFormatted = this.formatTime(endDate);
        }

        const calendarEvent: CalendarEvent = {
          title: event.summary || "(No title)",
          start: startFormatted,
          end: endFormatted,
          allDay: isAllDay,
          category: this.categorizeEventByTime(event, isAllDay),
        };

        // Respect maxEventsPerDay limit for both events array and eventsByCategory
        if (days[dayIndex].events.length < config.maxEventsPerDay) {
          days[dayIndex].events.push(calendarEvent);
          days[dayIndex].eventsByCategory[calendarEvent.category].push(
            calendarEvent,
          );
        }
      }
    }

    return { days };
  }

  async getData(config: ConfigType) {
    this.logger.debug({ runtimeConfig: config }, "Fetching calendar data");

    try {
      const events = await this.getCalendarEvents(config);
      const calendarData = this.transformEvents(events, config);

      this.logger.debug(
        {
          totalEvents: events.length,
          daysWithEvents: calendarData.days.filter((d) => d.events.length > 0)
            .length,
        },
        "Calendar data fetched successfully",
      );

      return calendarData;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error({ error: errorMessage }, "Failed to get calendar data");
      return {
        error: `Failed to fetch calendar data: ${errorMessage}`,
      };
    }
  }
}

export default CallbackCalendar;
