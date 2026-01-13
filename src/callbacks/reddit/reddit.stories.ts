import {
  createCallbackMeta,
  createLiveStory,
  createSampleStory,
} from "../../storybook/story-helpers";
import CallbackReddit from "./index";

// Co-located fixtures
const fixtures = {
  default: [
    {
      title: "TIL that octopuses have three hearts",
    },
    {
      title: "New TypeScript 5.0 features announced",
    },
    {
      title: "How to optimize React performance",
    },
  ],
  empty: [],
  singlePost: [
    {
      title: "Single post example",
    },
  ],
  longTitles: [
    {
      title:
        "This is an extremely long post title that goes on and on with lots of information and detail that might cause layout issues if not handled properly in the template",
    },
    {
      title:
        "Another very long title with even more content to test how the UI handles text wrapping and spacing when titles are particularly verbose and detailed",
    },
    {
      title: "Short title for contrast",
    },
  ],
  manyPosts: Array.from({ length: 15 }, (_, i) => ({
    title: `Reddit post number ${i + 1} about various interesting topics`,
  })),
};

const config = {
  CallbackClass: CallbackReddit,
  title: "Callbacks/Reddit",
  callbackPath: __dirname,
  defaultRuntimeConfig: { title: "r/programming" },
};

export default createCallbackMeta(config);

export const Default = createSampleStory(config, fixtures.default);

export const EmptyState = createSampleStory(config, fixtures.empty);

export const SinglePost = createSampleStory(config, fixtures.singlePost);

export const LongTitles = createSampleStory(config, fixtures.longTitles);

export const ManyPosts = createSampleStory(config, fixtures.manyPosts);

export const LiveData = createLiveStory(config, {
  subreddit: "programming",
  qty: 5,
});
