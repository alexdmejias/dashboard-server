import CallbackBaseDB from "./base-db";

type DBTableShape = {
  id: string;
  word: string;
  definitions: string;
  sentences: string;
};

type Word = {
  id: string;
  word: string;
  definitions: string[];
  sentences: string[];
};

class CallbackWord extends CallbackBaseDB<DBTableShape, Word> {
  constructor() {
    super({ name: "word", dataFile: "words" });
  }

  transformer({ id, word, definitions, sentences }: DBTableShape): Word {
    return {
      id,
      word,
      definitions: definitions.split("\\n"),
      sentences: sentences.split("\\n"),
    };
  }
}

export default CallbackWord;
