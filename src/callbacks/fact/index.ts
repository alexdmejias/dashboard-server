import CallbackBase from "../../base-callbacks/base";

type Fact = { id: string; content: string };

class CallbackFact extends CallbackBase<Fact> {
  constructor() {
    super({ name: "fact", template: "generic" });
  }

  // get migration() {
  //   return `CREATE TABLE IF NOT EXISTS ${this.dataFile} (
  //     id INTEGER PRIMARY KEY,
  //     content TEXT NOT NULL)`;
  // }
}

export default CallbackFact;
