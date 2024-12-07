import CallbackBaseDB from "./base-db";

type Quote = { author: string; content: string; id: string };

class CallbackQuote extends CallbackBaseDB<Quote> {
  constructor() {
    super({ name: "quote", dataFile: "quotes" });
  }

  get migration() {
    return `CREATE TABLE IF NOT EXISTS ${this.dataFile} (
      id INTEGER PRIMARY KEY,
      content TEXT NOT NULL,
      author TEXT NOT NULL)`
  }
}

export default CallbackQuote;
