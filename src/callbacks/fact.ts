import CallbackBaseDB from "./base-db";

type Fact = { id: string; content: string };

class CallbackFact extends CallbackBaseDB<Fact> {
  constructor() {
    super({ name: "fact", dataFile: "facts", template: "generic" });
  }
}

export default CallbackFact;
