import {
  createCallbackMeta,
  createSampleStory,
} from "../storybook/story-helpers";
import CallbackMessage from "./message";

// Co-located fixtures
const fixtures = {
  short: {
    content: ["Hello, World!"],
  },
  long: {
    content: [
      "This is a longer message that contains more information and detail to test how the template handles text wrapping and layout with extended content.",
    ],
  },
  multiLine: {
    content: [
      "Line 1: First item",
      "Line 2: Second item",
      "Line 3: Third item",
      "Line 4: Fourth item",
    ],
  },
};

const config = {
  CallbackClass: CallbackMessage,
  title: "Callbacks/Message",
  callbackPath: __dirname,
};

export default createCallbackMeta(config);

export const Short = createSampleStory(config, fixtures.short);

export const Long = createSampleStory(config, fixtures.long);

export const MultiLine = createSampleStory(config, fixtures.multiLine);
