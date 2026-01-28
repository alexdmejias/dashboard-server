import { z } from "zod/v4";
import CallbackBase from "../../base-callbacks/base";
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

type TodayWeather = ForecastWeather & { current: number };

type TemplateDataWeather = {
  today: TodayWeather;
  forecast: ForecastWeather[];
};

export const expectedConfig = z.object({
  zipcode: z.string(),
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
    const key = process.env.WEATHER_APIKEY; // TODO move to runtime config
    const { zipcode } = config;

    const data = await fetch(
      `https://api.weatherapi.com/v1/forecast.json?key=${key}&q=${zipcode}&days=3&aqi=no&alerts=no`,
    );
    return (await data.json()) as WeatherApiResponseRoot;
  }

  getToday(payload: WeatherApiResponseRoot): TodayWeather {
    return {
      max: payload.forecast.forecastday[0].day.maxtemp_f,
      low: payload.forecast.forecastday[0].day.mintemp_f,
      date: new Date(payload.forecast.forecastday[0].date).toLocaleDateString(),
      current: payload.current.temp_f,
      condition: {
        text: payload.current.condition.text,
        image: `https:${payload.current.condition.icon}`,
      },
    };
  }

  getForecast(payload: WeatherApiResponseRoot): ForecastWeather[] {
    const forecast = payload.forecast.forecastday.slice(1).map((dayData) => {
      const {
        day: { maxtemp_f, mintemp_f, condition },
      } = dayData;

      const date = new Date(`${dayData.date} 00:00:00`);
      return {
        max: maxtemp_f,
        low: mintemp_f,
        date: date.toDateString().slice(0, -5),
        condition: {
          text: condition.text,
          image: `http:${condition.icon}`,
        },
      };
    });

    return forecast;
  }

  async getData(config: ConfigType) {
    this.logger.debug(
      {
        runtimeConfig: config,
      },
      "Fetching weather data",
    );
    const weather = await this.getWeather(config);
    const forecast = this.getForecast(weather);
    const today = this.getToday(weather);

    this.logger.debug(
      {
        today,
        forecast,
      },
      "Weather data fetched successfully",
    );
    return {
      today,
      forecast,
    };
  }
}

export default CallbackWeather;
