import CallbackBase from "../../base-callbacks/base";

type Quote = { author: string; content: string; id: string };

class CallbackQuote extends CallbackBase<Quote> {
  constructor() {
    super({ name: "quote" });
  }
}

export default CallbackQuote;
