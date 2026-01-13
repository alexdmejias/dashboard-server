import {
  createCallbackMeta,
  createLiveStory,
  createSampleStory,
} from "../../storybook/story-helpers";
import CallbackFact from "./index";

// Co-located fixtures
const fixtures = {
  short: {
    id: "1",
    content: "Honey never spoils.",
  },
  medium: {
    id: "2",
    content:
      "A single cloud can weigh more than one million pounds. The water droplets that make up clouds are incredibly small and light, but there are billions of them.",
  },
  long: {
    id: "3",
    content:
      "The human brain is the most complex object in the known universe. It contains approximately 86 billion neurons, each connected to thousands of others through trillions of synaptic connections. This vast network enables consciousness, thought, memory, and the countless other functions that make us human.",
  },
};

const config = {
  CallbackClass: CallbackFact,
  title: "Callbacks/Fact",
  callbackPath: __dirname,
};

export default createCallbackMeta(config);

export const Short = createSampleStory(config, fixtures.short);

export const Medium = createSampleStory(config, fixtures.medium);

export const Long = createSampleStory(config, fixtures.long);

export const LiveData = createLiveStory(config);
