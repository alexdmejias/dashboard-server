import type { Playlist, PlaylistItem } from "../types";
import type { StatusWeather } from "./weather";

export const DEFAULT_STATUS_TIMEZONE = "America/New_York";

export type StatusPlaylistEntry = { id: string; title: string };

export type Status = {
  /** e.g. "Sat, Nov 7" */
  date: string;
  /** Time the screen was rendered, e.g. "9:41 AM" */
  renderedAt: string;
  /** e.g. "3 / 7" */
  position: string;
  current: StatusPlaylistEntry;
  previous?: StatusPlaylistEntry;
  next?: StatusPlaylistEntry;
  weather?: StatusWeather;
};

export function getPlaylistItemTitle(item: PlaylistItem): string {
  if (item.title) return item.title;
  return Object.values(item.callbacks)
    .map((cb: { name: string }) => cb.name)
    .join(" + ");
}

function toEntry(item: PlaylistItem): StatusPlaylistEntry {
  return { id: item.id, title: getPlaylistItemTitle(item) };
}

export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Build the data shown in the top/bottom status bars for the playlist item
 * at `index`. Previous/next wrap around; they are omitted when the playlist
 * has a single item.
 */
export function buildStatus({
  playlist,
  index,
  now = new Date(),
  timezone = DEFAULT_STATUS_TIMEZONE,
  weather,
}: {
  playlist: Playlist;
  index: number;
  now?: Date;
  timezone?: string;
  weather?: StatusWeather;
}): Status {
  const count = playlist.length;
  const current = playlist[index];
  const hasNeighbours = count > 1;

  return {
    date: new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(now),
    renderedAt: new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "2-digit",
    }).format(now),
    position: `${index + 1} / ${count}`,
    current: toEntry(current),
    previous: hasNeighbours
      ? toEntry(playlist[(index - 1 + count) % count])
      : undefined,
    next: hasNeighbours ? toEntry(playlist[(index + 1) % count]) : undefined,
    weather,
  };
}
