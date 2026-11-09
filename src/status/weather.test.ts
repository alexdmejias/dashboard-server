import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WeatherApiResponseRoot } from "../callbacks/weather/types";

vi.mock("../settings", () => ({
  getSettings: vi.fn(() => ({ weatherApiKey: "test-key" })),
}));

import { getSettings } from "../settings";
import {
  clearStatusWeatherCache,
  getStatusWeather,
  toStatusWeather,
} from "./weather";

const payload = {
  current: {
    temp_f: 51.6,
    condition: { text: "Partly cloudy", icon: "//cdn.weatherapi.com/116.png" },
  },
  forecast: {
    forecastday: [
      {
        day: { maxtemp_f: 58.2, mintemp_f: 40.7 },
        astro: { sunrise: "06:30 AM", sunset: "04:52 PM" },
      },
    ],
  },
} as unknown as WeatherApiResponseRoot;

function mockFetchOk() {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => payload,
  });
}

describe("toStatusWeather", () => {
  it("maps the weatherapi payload", () => {
    expect(toStatusWeather(payload)).toEqual({
      tempF: 52,
      condition: "Partly cloudy",
      icon: "https://cdn.weatherapi.com/116.png",
      hiF: 58,
      loF: 41,
      sunset: "4:52 PM",
    });
  });

  it("keeps two-digit hours intact", () => {
    const late = structuredClone(payload) as any;
    late.forecast.forecastday[0].astro.sunset = "10:05 PM";
    expect(toStatusWeather(late).sunset).toBe("10:05 PM");
  });
});

describe("getStatusWeather", () => {
  beforeEach(() => {
    clearStatusWeatherCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.mocked(getSettings).mockReturnValue({
      weatherApiKey: "test-key",
    } as any);
  });

  it("returns undefined without a zipcode", async () => {
    const fetchMock = mockFetchOk();
    vi.stubGlobal("fetch", fetchMock);
    expect(await getStatusWeather(undefined)).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns undefined without an API key", async () => {
    vi.mocked(getSettings).mockReturnValue({} as any);
    const fetchMock = mockFetchOk();
    vi.stubGlobal("fetch", fetchMock);
    expect(await getStatusWeather("10001")).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("caches results per location", async () => {
    const fetchMock = mockFetchOk();
    vi.stubGlobal("fetch", fetchMock);
    const t0 = 1_000_000;

    expect((await getStatusWeather("10001", t0))?.tempF).toBe(52);
    await getStatusWeather("10001", t0 + 60_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await getStatusWeather("90210", t0);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // past the TTL it fetches again
    await getStatusWeather("10001", t0 + 21 * 60_000);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("shares a single request between concurrent callers", async () => {
    const fetchMock = mockFetchOk();
    vi.stubGlobal("fetch", fetchMock);
    await Promise.all([getStatusWeather("10001"), getStatusWeather("10001")]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("never throws and keeps the last good reading on failure", async () => {
    const t0 = 1_000_000;
    vi.stubGlobal("fetch", mockFetchOk());
    await getStatusWeather("10001", t0);

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    const stale = await getStatusWeather("10001", t0 + 21 * 60_000);
    expect(stale?.tempF).toBe(52);
  });

  it("returns undefined on a failed first request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401 }),
    );
    expect(await getStatusWeather("10001")).toBeUndefined();
  });
});
