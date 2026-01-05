/**
 * Google Calendar Callback
 *
 * Fetches events from Google Calendar for the next 7 days and displays them in a weekly view.
 *
 * ## Setup Instructions
 *
 * ### 1. Create Google Cloud Project & Enable Calendar API
 * - Go to https://console.cloud.google.com/
 * - Create a new project or select existing one
 * - Enable the Google Calendar API for your project
 * - Navigate to "Credentials" and create OAuth 2.0 Client ID
 * - Download the credentials JSON
 *
 * ### 2. Get Refresh Token
 * You can use the OAuth 2.0 Playground to get a refresh token:
 * - Go to https://developers.google.com/oauthplayground/
 * - Click the gear icon (settings) in the top right
 * - Check "Use your own OAuth credentials"
 * - Enter your Client ID and Client Secret
 * - In the left panel, select "Calendar API v3"
 * - Select the scope: https://www.googleapis.com/auth/calendar.readonly
 * - Click "Authorize APIs"
 * - Sign in with your Google account and grant permissions
 * - Click "Exchange authorization code for tokens"
 * - Copy the "Refresh token"
 *
 * ### 3. Set Environment Variables
 * Add these to your .env file:
 * - GOOGLE_CLIENT_ID: Your OAuth 2.0 Client ID
 * - GOOGLE_CLIENT_SECRET: Your OAuth 2.0 Client Secret
 * - GOOGLE_REFRESH_TOKEN: The refresh token from step 2
 *
 * ### 4. Usage
 * The callback accepts the following runtime configuration:
 * - calendarId: (optional) The calendar ID to fetch events from (default: 'primary')
 * - maxEventsPerDay: (optional) Maximum number of events to show per day (default: 5)
 */

import { google } from "googleapis";
import { z } from "zod/v4";
import CallbackBase from "../../base-callbacks/base";
import type { GoogleCalendarEvent } from "./types";

type CalendarEvent = {
  title: string;
  start: string; // ISO date string
  end: string; // ISO date string
  allDay: boolean;
};

type DayEvents = {
  date: string; // formatted date string (e.g., "Mon Jan 5")
  dayOfWeek: string; // e.g., "Monday"
  events: CalendarEvent[];
};

type CalendarData = {
  days: DayEvents[]; // 7 days starting from today
};

export const expectedConfig = z.object({
  calendarId: z.string().default("primary"),
  maxEventsPerDay: z.number().default(5),
});

type ConfigType = z.infer<typeof expectedConfig>;

class CallbackCalendar extends CallbackBase<
  CalendarData,
  typeof expectedConfig
> {
  static defaultOptions: ConfigType = {
    calendarId: "primary",
    maxEventsPerDay: 5,
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
   * Creates OAuth2 client with refresh token for authentication
   */
  private getAuthClient() {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      "https://developers.google.com/oauthplayground", // redirect URI
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    return oauth2Client;
  }

  /**
   * Fetches calendar events for the next 7 days
   */
  async getCalendarEvents(config: ConfigType) {
    try {
      const auth = this.getAuthClient();
      const calendar = google.calendar({ version: "v3", auth });

      const now = new Date();
      const endDate = new Date();
      endDate.setDate(now.getDate() + 7);

      this.logger.debug(
        {
          calendarId: config.calendarId,
          timeMin: now.toISOString(),
          timeMax: endDate.toISOString(),
        },
        "Fetching calendar events",
      );

      const response = await calendar.events.list({
        calendarId: config.calendarId,
        timeMin: now.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
        maxResults: config.maxEventsPerDay * 7, // rough limit
      });

      return response.data.items || [];
    } catch (error) {
      this.logger.error({ error }, "Failed to fetch calendar events");
      throw error;
    }
  }

  /**
   * Format date as "Mon Jan 5"
   */
  private formatDate(date: Date): string {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    return `${days[date.getDay()]} ${months[date.getMonth()]} ${date.getDate()}`;
  }

  /**
   * Get full day of week name
   */
  private getDayOfWeek(date: Date): string {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return days[date.getDay()];
  }

  /**
   * Format time as "9:00 AM"
   */
  private formatTime(date: Date): string {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
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
    return new Date(startStr);
  }

  /**
   * Transform Google Calendar API response to our data structure
   */
  private transformEvents(
    events: GoogleCalendarEvent[],
    config: ConfigType,
  ): CalendarData {
    // Create array of next 7 days
    const days: DayEvents[] = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() + i);

      days.push({
        date: this.formatDate(date),
        dayOfWeek: this.getDayOfWeek(date),
        events: [],
      });
    }

    // Group events by day
    for (const event of events) {
      const startDate = this.getEventStart(event);
      const startDay = new Date(startDate);
      startDay.setHours(0, 0, 0, 0);

      // Find which day this event belongs to
      const dayIndex = Math.floor(
        (startDay.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (dayIndex >= 0 && dayIndex < 7) {
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
        };

        // Respect maxEventsPerDay limit
        if (days[dayIndex].events.length < config.maxEventsPerDay) {
          days[dayIndex].events.push(calendarEvent);
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
