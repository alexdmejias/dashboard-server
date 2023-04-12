import CallbackBase from "./base";

type Quote = {author: string, content: string};

class CallbackQuote extends CallbackBase {
  allQuotes: Quote[] = [];
  availableQuoteIndexes: number[] = []

  constructor() {
    super("quote");

    this.allQuotes = [
      {
        author: "author 0",
        content: "quote 0",
      },
      {
        author: "author 1",
        content: "quote 1",
      },
      {
        author: "author 2",
        content: "quote 2",
      },
      {
        author: "author 3",
        content: "quote 3",
      },
    ];

    this.resetPickedQuotes();
  }

  resetPickedQuotes() {
    this.availableQuoteIndexes = Array(this.allQuotes.length)
      .fill(0)
      .map((i, index) => index);
  }

  pickQuote() {
    if (this.availableQuoteIndexes.length === 0) {
      this.resetPickedQuotes();
    }

    const randomElem = Math.floor(
      Math.random() * this.availableQuoteIndexes.length
    );
    const item = this.availableQuoteIndexes[randomElem];

    this.availableQuoteIndexes.splice(randomElem, 1);

    return this.allQuotes[item]; //?
  }

  async getData() {
    return this.pickQuote();
  }
}

export default CallbackQuote;
