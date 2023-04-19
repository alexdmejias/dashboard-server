import CallbackBase from "./base";

type Quote = { author: string; content: string };

class CallbackQuote extends CallbackBase {
  availableQuoteIndexes: number[] = [];

  constructor() {
    super("quote", "quote", "quotes");

    // this.resetPickedQuotes();
  }

  // async getQuotes() {}

  // resetPickedQuotes() {
  //   this.availableQuoteIndexes = Array(allQuotes.length)
  //     .fill(0)
  //     .map((i, index) => index);
  // }

  // pickQuote() {
  //   if (this.availableQuoteIndexes.length === 0) {
  //     this.resetPickedQuotes();
  //   }

  //   const randomElem = Math.floor(
  //     Math.random() * this.availableQuoteIndexes.length
  //   );
  //   const item = this.availableQuoteIndexes[randomElem];

  //   this.availableQuoteIndexes.splice(randomElem, 1);

  //   return allQuotes[item];
  // }

  async getData() {
    try {
      const { index, item } = await this.getItemFromFile<Quote>();

      return { index, item };
    } catch (e) {
      if (e instanceof Error) {
        return { error: e.message };
      } else if (typeof e === "string") {
        return { error: e };
      }
      return {};
    }
  }
}

export default CallbackQuote;
