import type { Meta, StoryObj } from "@storybook/html-vite";
import {
  createFullLayoutStoryConfig,
  createSplitLayoutStoryConfig,
  createLayoutFixtures,
  combineCallbacksForSplit,
} from "../../.storybook/layoutTestHelpers";

// Get test fixtures
const fixtures = createLayoutFixtures();

// Full Layout Stories
const fullLayoutMeta = {
  title: "Layouts/Full Layout",
  ...createFullLayoutStoryConfig(),
} satisfies Meta;

export default fullLayoutMeta;
type FullStory = StoryObj<typeof fullLayoutMeta>;

export const FullLayoutSingleCallback: FullStory = {
  args: {
    content: fixtures.singleCallback.content,
  },
  parameters: {
    docs: {
      description: {
        story: "Tests full layout with a single callback. Callback should fill the entire screen width.",
      },
    },
  },
};

export const FullLayoutWithRealWeather: FullStory = {
  args: {
    content: `
<div class="layout layout--col">
  <div class="flex flex--col w-50">
    <h1 class="title">Now: 72°</h1>
    <div class="flex flex--row w-100">
      <div class="outline flex flex--col w-100 flex-1 p-2">
        <h3 class="title">Today</h3>
        <p class="title">Partly cloudy</p>
        <p class="title">65° / 75°</p>
      </div>
    </div>
  </div>
</div>
    `,
  },
  parameters: {
    docs: {
      description: {
        story: "Example of full layout with weather-like content",
      },
    },
  },
};

// Split Layout Stories
const splitLayoutMeta = {
  title: "Layouts/Split Layout",
  ...createSplitLayoutStoryConfig(),
} satisfies Meta;

export { splitLayoutMeta };
type SplitStory = StoryObj<typeof splitLayoutMeta>;

export const SplitLayoutTwoCallbacks: SplitStory = {
  args: {
    content: combineCallbacksForSplit([
      fixtures.twoCallbacks.left,
      fixtures.twoCallbacks.right,
    ]),
  },
  parameters: {
    docs: {
      description: {
        story: "Tests split layout with two callbacks. Both callbacks should take up equal width (50% each).",
      },
    },
  },
};

export const SplitLayoutWeatherAndTasks: SplitStory = {
  args: {
    content: combineCallbacksForSplit([
      `
<div class="layout layout--col">
  <div class="flex flex--col w-50">
    <h1 class="title">Weather</h1>
    <div class="flex flex--row w-100">
      <div class="outline flex flex--col w-100 flex-1 p-2">
        <h3 class="title">Today</h3>
        <p class="title">Sunny</p>
        <p class="title">68° / 82°</p>
      </div>
    </div>
  </div>
</div>
      `,
      `
<div class="layout layout--col">
  <div class="flex flex--col w-50">
    <h1 class="title">Tasks</h1>
    <div class="flex flex--row w-100">
      <div class="outline flex flex--col w-100 flex-1 p-2">
        <p class="title">• Review PR</p>
        <p class="title">• Update docs</p>
        <p class="title">• Deploy changes</p>
      </div>
    </div>
  </div>
</div>
      `,
    ]),
  },
  parameters: {
    docs: {
      description: {
        story: "Example of split layout combining weather and task list callbacks",
      },
    },
  },
};

export const SplitLayoutUnevenContent: SplitStory = {
  args: {
    content: combineCallbacksForSplit([
      `
<div class="layout layout--col">
  <div class="flex flex--col w-50">
    <h1 class="title">Short</h1>
    <p class="title">Brief content</p>
  </div>
</div>
      `,
      `
<div class="layout layout--col">
  <div class="flex flex--col w-50">
    <h1 class="title">Long Content</h1>
    <div class="outline flex flex--col w-100 flex-1 p-2">
      <p class="title">This is a much longer piece of content</p>
      <p class="title">With multiple paragraphs</p>
      <p class="title">To test how the layout handles</p>
      <p class="title">Uneven content distribution</p>
      <p class="title">Between the two columns</p>
    </div>
  </div>
</div>
      `,
    ]),
  },
  parameters: {
    docs: {
      description: {
        story: "Tests how split layout handles uneven content lengths. Both sides should still maintain equal width.",
      },
    },
  },
};
