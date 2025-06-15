import CallbackBase from "../../base-callbacks/base";

type Word = {
  id: string;
  word: string;
  definitions: string[];
  sentences: string[];
};

type DBTableShape = {
  id: string;
  word: string;
  definitions: string;
  sentences: string;
};

class CallbackWord extends CallbackBase<Word> {
  constructor() {
    super({ name: "word" });
  }

  transformer(item: DBTableShape): Word {
    return {
      id: item.id,
      word: item.word,
      definitions: item.definitions.split("\\n"),
      sentences: item.sentences.split("\\n"),
    };
  }

  async getData() {
    const item = await this.getDBData<DBTableShape>("words", this.transformer);
    return item;
  }
}

export default CallbackWord;
