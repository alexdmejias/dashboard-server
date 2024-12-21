import CallbackBase from "./base";

// https://github.com/showdownjs/showdown/wiki/emojis
class MarkdownTest extends CallbackBase {
  constructor() {
    super({ name: "markdown" });
  }

  async getData() {
    return {
      markdown: `# h1

`,
    };
  }
}

export default MarkdownTest;
