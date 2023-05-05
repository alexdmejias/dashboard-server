import CallbackBaseDB from "./base-db";

type Quote = { author: string; content: string; id: string };

class CallbackQuote extends CallbackBaseDB<Quote> {
  constructor() {
    super({ name: "quote", dataFile: "quotes" });
  }
}

export default CallbackQuote;
