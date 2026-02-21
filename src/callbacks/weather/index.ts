import { z } from "zod/v4";
import CallbackBase from "../../base-callbacks/base";
import { getApiKey } from "../../settings";
import type { WeatherApiResponseRoot } from "./types";

type ForecastWeather = {
  max: number;
  low: number;
  date: string;
  condition: {
    text: string;
    image: string;
  };
};

type TemplateDataWeather = {
  current: WeatherApiResponseRoot["current"];
  forecast: ForecastWeather[];
};

export const expectedConfig = z.object({
  zipcode: z.string(),
  title: z.string().optional(),
});

type ConfigType = z.infer<typeof expectedConfig>;

class CallbackWeather extends CallbackBase<
  TemplateDataWeather,
  typeof expectedConfig
> {
  static defaultOptions: ConfigType = {
    zipcode: "10001",
  };

  constructor(options = {}) {
    super({
      name: "weather",
      expectedConfig,
      envVariablesNeeded: ["WEATHER_APIKEY"],
      receivedConfig: options,
    });
  }

  async getWeather(config: ConfigType) {
    const key = getApiKey("WEATHER_APIKEY");
    const { zipcode } = config;

    const data = await fetch(
      `https://api.weatherapi.com/v1/forecast.json?key=${key}&q=${zipcode}&days=3&aqi=no&alerts=no`,
    );
    return (await data.json()) as WeatherApiResponseRoot;
  }

  getForecast(payload: WeatherApiResponseRoot): ForecastWeather[] {
    const forecast = payload.forecast.forecastday.map((dayData) => {
      const {
        day: { maxtemp_f, mintemp_f, condition },
      } = dayData;

      return {
        max: Math.round(maxtemp_f),
        low: Math.round(mintemp_f),
        date: new Date(dayData.date).toLocaleDateString().slice(0, -5),
        condition: {
          text: condition.text,
          image: `https:${condition.icon}`,
        },
      };
    });

    return forecast;
  }

  async getData(config: ConfigType) {
    this.logger.trace(
      {
        runtimeConfig: config,
      },
      "Fetching weather data",
    );
    const weather = await this.getWeather(config);
    const forecast = this.getForecast(weather);

    this.logger.trace(
      {
        forecast,
        current: weather.current,
      },
      "Weather data fetched successfully",
    );
    return {
      current: weather.current,
      forecast,
    };
  }
}

export default CallbackWeather;
