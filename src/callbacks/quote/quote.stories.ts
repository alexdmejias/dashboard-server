import {
  createCallbackMeta,
  createLiveStory,
  createSampleStory,
} from "../../storybook/story-helpers";
import CallbackQuote from "./index";

// Co-located fixtures
const fixtures = {
  short: {
    id: "1",
    content: "Be yourself; everyone else is already taken.",
    author: "Oscar Wilde",
  },
  medium: {
    id: "2",
    content:
      "Two things are infinite: the universe and human stupidity; and I'm not sure about the universe.",
    author: "Albert Einstein",
  },
  long: {
    id: "3",
    content:
      "The only way to do great work is to love what you do. If you haven't found it yet, keep looking. Don't settle. As with all matters of the heart, you'll know when you find it.",
    author: "Steve Jobs",
  },
  extreme: {
    id: "4",
    content:
      "In the beginning the Universe was created. This has made a lot of people very angry and been widely regarded as a bad move. The story so far: In the beginning the Universe was created. This has made a lot of people very angry and been widely regarded as a bad move.",
    author: "Douglas Adams, The Restaurant at the End of the Universe",
  },
};

const config = {
  CallbackClass: CallbackQuote,
  title: "Callbacks/Quote",
  callbackPath: __dirname,
};

export default createCallbackMeta(config);

export const Short = createSampleStory(config, fixtures.short);

export const Medium = createSampleStory(config, fixtures.medium);

export const Long = createSampleStory(config, fixtures.long);

export const ExtremelyLong = createSampleStory(config, fixtures.extreme);

export const LiveData = createLiveStory(config);
