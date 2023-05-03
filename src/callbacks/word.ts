import CallbackBaseDB from "./base-db";

type Word = {
  word: string;
  definitions: string[];
  sentences: string[];
};

class CallbackWord extends CallbackBaseDB<Word> {
  constructor() {
    super({ name: "word", dataFile: "words" });
  }
}

export default CallbackWord;
