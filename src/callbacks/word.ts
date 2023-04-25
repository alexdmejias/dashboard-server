import CallbackBase from "./base";

type Word = {
  word: string;
  definitions: string[];
  sentences: string[];
};

class CallbackWord extends CallbackBase {
  constructor() {
    super({ name: "word", dataFile: "words" });
  }

  async getData() {
    try {
      const { index, item } = await this.getItemFromFile<Word>();

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

export default CallbackWord;
