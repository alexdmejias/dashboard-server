import type { WeatherApiResponseRoot } from "../callbacks/weather/types";
import logger from "../logger";
import { getSettings } from "../settings";

export type StatusWeather = {
  tempF: number;
  condition: string;
  icon: string;
  hiF?: number;
  loF?: number;
  sunset?: string;
};

const CACHE_TTL_MS = 20 * 60 * 1000;
const FAILURE_TTL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 3000;

type CacheEntry = { expiresAt: number; value: StatusWeather | undefined };
const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<StatusWeather | undefined>>();

export function clearStatusWeatherCache() {
  cache.clear();
  inFlight.clear();
}

export function toStatusWeather(
  payload: WeatherApiResponseRoot,
): StatusWeather {
  const today = payload.forecast?.forecastday?.[0];
  const icon = payload.current.condition.icon;
  return {
    tempF: Math.round(payload.current.temp_f),
    condition: payload.current.condition.text,
    icon: icon.startsWith("//") ? `https:${icon}` : icon,
    hiF: today ? Math.round(today.day.maxtemp_f) : undefined,
    loF: today ? Math.round(today.day.mintemp_f) : undefined,
    // weatherapi returns "04:52 PM"; drop the leading zero
    sunset: today?.astro?.sunset?.replace(/^0(\d)/, "$1"),
  };
}

async function fetchStatusWeather(
  zipcode: string,
): Promise<StatusWeather | undefined> {
  const key = getSettings().weatherApiKey;
  if (!key) {
    logger.debug("status bar weather skipped: weatherApiKey is not set");
    return undefined;
  }

  const url = `https://api.weatherapi.com/v1/forecast.json?key=${key}&q=${encodeURIComponent(zipcode)}&days=1&aqi=no&alerts=no`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`weatherapi responded with ${res.status}`);
  }
  return toStatusWeather((await res.json()) as WeatherApiResponseRoot);
}

/**
 * Current conditions for the status bar. Cached in memory per location so
 * rendering a screen doesn't cost an API call each time. Never throws: on
 * any failure it returns undefined and the bar hides the weather section.
 */
export async function getStatusWeather(
  zipcode: string | undefined,
  now = Date.now(),
): Promise<StatusWeather | undefined> {
  if (!zipcode) return undefined;

  const cached = cache.get(zipcode);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const pending = inFlight.get(zipcode);
  if (pending) return pending;

  const request = fetchStatusWeather(zipcode)
    .then((value) => {
      cache.set(zipcode, {
        value,
        expiresAt: now + (value ? CACHE_TTL_MS : FAILURE_TTL_MS),
      });
      return value;
    })
    .catch((error) => {
      logger.warn({ error, zipcode }, "status bar weather fetch failed");
      // Keep showing the last good reading if we have one
      const value = cached?.value;
      cache.set(zipcode, { value, expiresAt: now + FAILURE_TTL_MS });
      return value;
    })
    .finally(() => {
      inFlight.delete(zipcode);
    });

  inFlight.set(zipcode, request);
  return request;
}
