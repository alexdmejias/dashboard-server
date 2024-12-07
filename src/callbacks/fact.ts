import CallbackBaseDB from "./base-db";

type Fact = { id: string; content: string };

class CallbackFact extends CallbackBaseDB<Fact> {
  constructor() {
    super({ name: "fact", dataFile: "facts", template: "generic" });
  }

  get migration() {
    return `CREATE TABLE IF NOT EXISTS ${this.dataFile} (
      id INTEGER PRIMARY KEY,
      content TEXT NOT NULL)`
  }
}

export default CallbackFact;
