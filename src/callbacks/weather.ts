import { WeatherApiResponseRoot } from "../types";
import CallbackBase from "./base";

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

class CallbackWeather extends CallbackBase<TemplateDataWeather> {
  constructor() {
    super({
      name: "weather",
      envVariablesNeeded: ["WEATHER_APIKEY", "WEATHER_ZIPCODE"],
    });
  }

  async getWeather(): Promise<WeatherApiResponseRoot> {
    const key = process.env.WEATHER_APIKEY;
    const zipcode = process.env.WEATHER_ZIPCODE;

    const data = await fetch(
      `http://api.weatherapi.com/v1/forecast.json?key=${key}&q=${zipcode}&days=3&aqi=no&alerts=no`
    );
    return data.json();
  }

  getToday(payload: WeatherApiResponseRoot): TodayWeather {
    return {
      max: payload.forecast.forecastday[0].day.maxtemp_f,
      low: payload.forecast.forecastday[0].day.mintemp_f,
      date: new Date(payload.forecast.forecastday[0].date).toLocaleDateString(),
      current: payload.current.temp_f,
      condition: {
        text: payload.current.condition.text,
        image: `http:${payload.current.condition.icon}`,
      },
    };
  }

  getForecast(payload: WeatherApiResponseRoot): ForecastWeather[] {
    const forecast = payload.forecast.forecastday.slice(1).map((dayData) => {
      const {
        day: { maxtemp_f, mintemp_f, condition },
      } = dayData;

      const date = new Date(dayData.date + " 00:00:00");
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

  async getData() {
    const weather = await this.getWeather();
    const forecast = this.getForecast(weather);
    const today = this.getToday(weather);

    return {
      today,
      forecast,
    };
  }
}

export default CallbackWeather;
