import CallbackBase from "./base";

class CallbackOnThisDay extends CallbackBase {
  constructor() {
    super("onThisDay", "onThisDay");
  }

  async getData() {
    return { data: "on this day" };
  }
}

export default CallbackOnThisDay;
