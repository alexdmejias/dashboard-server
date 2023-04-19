import CallbackBase from "./base";

class CallbackWeather extends CallbackBase {
  constructor() {
    super({ name: "weather" });
  }

  async getData() {
    return { data: "weather for zipcode" };
  }
}

export default CallbackWeather;
