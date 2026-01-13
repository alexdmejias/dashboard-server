import {
  createCallbackMeta,
  createLiveStory,
  createSampleStory,
} from "../../storybook/story-helpers";
import CallbackTodoist from "./index";

// Co-located fixtures
const fixtures = {
  default: {
    sections: [
      {
        key: "123",
        name: "Today",
        items: [
          {
            id: "1",
            content: "Review pull requests",
            section_id: "123",
          },
          {
            id: "2",
            content: "Update documentation",
            section_id: "123",
          },
          {
            id: "3",
            content: "Team standup at 10am",
            section_id: "123",
          },
        ],
      },
    ],
  },
  empty: {
    sections: [
      {
        key: "123",
        name: "Today",
        items: [],
      },
    ],
  },
  multipleSections: {
    sections: [
      {
        key: "123",
        name: "Work",
        items: [
          {
            id: "1",
            content: "Deploy to production",
            section_id: "123",
          },
          {
            id: "2",
            content: "Code review",
            section_id: "123",
          },
        ],
      },
      {
        key: "456",
        name: "Personal",
        items: [
          {
            id: "3",
            content: "Buy groceries",
            section_id: "456",
          },
          {
            id: "4",
            content: "Call dentist",
            section_id: "456",
          },
        ],
      },
      {
        key: "789",
        name: "Learning",
        items: [
          {
            id: "5",
            content: "Read TypeScript docs",
            section_id: "789",
          },
        ],
      },
    ],
  },
  longTitles: {
    sections: [
      {
        key: "123",
        name: "Today",
        items: [
          {
            id: "1",
            content:
              "This is a really long task name that might wrap to multiple lines and we need to see how it displays",
            section_id: "123",
          },
          {
            id: "2",
            content:
              "Another extremely long task with detailed information about what needs to be done including multiple steps",
            section_id: "123",
          },
        ],
      },
    ],
  },
  stressTest: {
    sections: [
      {
        key: "123",
        name: "Today",
        items: Array.from({ length: 20 }, (_, i) => ({
          id: `${i + 1}`,
          content: `Task ${i + 1}: Do something important`,
          section_id: "123",
        })),
      },
    ],
  },
};

const config = {
  CallbackClass: CallbackTodoist,
  title: "Callbacks/Todoist",
  callbackPath: __dirname,
  defaultRuntimeConfig: { title: "My Tasks" },
};

export default createCallbackMeta(config);

export const Default = createSampleStory(config, fixtures.default);

export const EmptyState = createSampleStory(config, fixtures.empty);

export const MultipleSections = createSampleStory(
  config,
  fixtures.multipleSections,
);

export const LongTitles = createSampleStory(config, fixtures.longTitles);

export const StressTest = createSampleStory(config, fixtures.stressTest);

export const LiveData = createLiveStory(config, {
  sections: [{ key: "YOUR_SECTION_ID", name: "Today" }],
});
