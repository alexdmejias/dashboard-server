import CallbackBase from "../base-callbacks/base";

type Joke = { id: string; content: string[] };

class CallbackJoke extends CallbackBase<Joke> {
  constructor() {
    super({ name: "joke", template: "generic" });
  }

  // transformer(data: DBTableShape): Joke {
  //   return {
  //     id: data.id,
  //     content: data.content.split("\\n"),
  //   };
  // }
}

export default CallbackJoke;
