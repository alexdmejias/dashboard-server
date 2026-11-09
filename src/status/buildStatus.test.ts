import { describe, expect, it } from "vitest";
import type { Playlist } from "../types";
import {
  buildStatus,
  getPlaylistItemTitle,
  isValidTimezone,
} from "./buildStatus";

const playlist: Playlist = [
  {
    id: "a",
    title: "Weather",
    layout: "full",
    callbacks: { content: { name: "weather" } },
  },
  {
    id: "b",
    layout: "2-col",
    callbacks: {
      content_left: { name: "calendar" },
      content_right: { name: "todoist" },
    },
  },
  { id: "c", layout: "full", callbacks: { content: { name: "reddit" } } },
];

// 2026-11-07 14:41 UTC = 9:41 AM in New York
const now = new Date("2026-11-07T14:41:00Z");

describe("getPlaylistItemTitle", () => {
  it("uses the explicit title when set", () => {
    expect(getPlaylistItemTitle(playlist[0])).toBe("Weather");
  });

  it("falls back to the callback names", () => {
    expect(getPlaylistItemTitle(playlist[1])).toBe("calendar + todoist");
    expect(getPlaylistItemTitle(playlist[2])).toBe("reddit");
  });
});

describe("buildStatus", () => {
  it("returns position, previous and next for a middle item", () => {
    const status = buildStatus({ playlist, index: 1, now });
    expect(status.position).toBe("2 / 3");
    expect(status.current).toEqual({ id: "b", title: "calendar + todoist" });
    expect(status.previous).toEqual({ id: "a", title: "Weather" });
    expect(status.next).toEqual({ id: "c", title: "reddit" });
  });

  it("wraps previous and next around the ends of the playlist", () => {
    expect(buildStatus({ playlist, index: 0, now }).previous?.id).toBe("c");
    expect(buildStatus({ playlist, index: 2, now }).next?.id).toBe("a");
  });

  it("omits previous and next for a single-item playlist", () => {
    const status = buildStatus({ playlist: [playlist[0]], index: 0, now });
    expect(status.position).toBe("1 / 1");
    expect(status.previous).toBeUndefined();
    expect(status.next).toBeUndefined();
  });

  it("formats the date and render time in the given timezone", () => {
    const ny = buildStatus({ playlist, index: 0, now });
    expect(ny.date).toBe("Sat, Nov 7");
    expect(ny.renderedAt).toBe("9:41 AM");

    const tokyo = buildStatus({
      playlist,
      index: 0,
      now,
      timezone: "Asia/Tokyo",
    });
    expect(tokyo.date).toBe("Sat, Nov 7");
    expect(tokyo.renderedAt).toBe("11:41 PM");
  });

  it("passes weather through", () => {
    const weather = { tempF: 52, condition: "Sunny", icon: "x.png" };
    expect(buildStatus({ playlist, index: 0, now, weather }).weather).toBe(
      weather,
    );
  });
});

describe("isValidTimezone", () => {
  it("accepts IANA zones and rejects junk", () => {
    expect(isValidTimezone("America/Los_Angeles")).toBe(true);
    expect(isValidTimezone("Not/AZone")).toBe(false);
  });
});
