import { Liquid } from "liquidjs";
import fullLayoutTemplate from "../views/layouts/full.liquid?raw";
import splitLayoutTemplate from "../views/layouts/split.liquid?raw";

/**
 * Utility for creating layout-based Storybook stories
 * 
 * This helper simplifies creating stories that test callback combinations
 * within the full and split layouts.
 */

export type LayoutType = "full" | "split";

/**
 * Create a story render function for a specific layout
 */
export const createLayoutStory = (layout: LayoutType) => {
  const template = layout === "full" ? fullLayoutTemplate : splitLayoutTemplate;
  
  return (args: any) => {
    const engine = new Liquid();
    return engine.parseAndRenderSync(template, args);
  };
};

/**
 * Combine multiple callback HTML outputs for split layout
 * 
 * @param callbackContents - Array of HTML strings from callback renders
 * @returns Combined HTML wrapped in divs for split layout
 */
export const combineCallbacksForSplit = (callbackContents: string[]): string => {
  return callbackContents
    .map((content) => `<div>${content}</div>`)
    .join("\n");
};

/**
 * Extract callback content from full rendered HTML
 * Removes head, footer, and wrapper divs to get just the callback content
 * 
 * @param html - Full HTML output from callback render
 * @returns Extracted callback content
 */
export const extractCallbackContent = (html: string): string => {
  // Extract content between <div class="view view--full"> and title_bar
  const viewStart = html.indexOf('<div class="view view--full">');
  const titleBarStart = html.indexOf('<div class="title_bar">');
  
  if (viewStart === -1 || titleBarStart === -1) {
    // Fallback: return the whole HTML
    return html;
  }
  
  const contentStart = viewStart + '<div class="view view--full">'.length;
  const content = html.substring(contentStart, titleBarStart).trim();
  return content;
};

/**
 * Create test fixtures for layouts
 * 
 * Helper to generate consistent test data for layout stories
 */
export const createLayoutFixtures = () => {
  return {
    singleCallback: {
      content: `
<div class="layout layout--col">
  <div class="flex flex--col w-50">
    <h1 class="title">Test Callback</h1>
    <div class="flex flex--row w-100">
      <div class="outline flex flex--col w-100 flex-1 p-2">
        <h3 class="title">Content</h3>
        <p class="title">This is test content.</p>
      </div>
    </div>
  </div>
</div>
      `.trim(),
    },
    twoCallbacks: {
      left: `
<div class="layout layout--col">
  <div class="flex flex--col w-50">
    <h1 class="title">Left Callback</h1>
    <div class="flex flex--row w-100">
      <div class="outline flex flex--col w-100 flex-1 p-2">
        <p class="title">Left side content</p>
      </div>
    </div>
  </div>
</div>
      `.trim(),
      right: `
<div class="layout layout--col">
  <div class="flex flex--col w-50">
    <h1 class="title">Right Callback</h1>
    <div class="flex flex--row w-100">
      <div class="outline flex flex--col w-100 flex-1 p-2">
        <p class="title">Right side content</p>
      </div>
    </div>
  </div>
</div>
      `.trim(),
    },
  };
};

/**
 * Render a callback template with data for testing
 * 
 * @param template - Liquid template string
 * @param data - Data to pass to the template
 * @returns Rendered HTML
 */
export const renderCallbackForTest = async (
  template: string,
  data: Record<string, any>
): Promise<string> => {
  const engine = new Liquid();
  return engine.parseAndRender(template, { data });
};

/**
 * Create a full layout story configuration
 */
export const createFullLayoutStoryConfig = () => ({
  render: createLayoutStory("full"),
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: "Full-page layout for displaying a single callback",
      },
    },
  },
});

/**
 * Create a split layout story configuration
 */
export const createSplitLayoutStoryConfig = () => ({
  render: createLayoutStory("split"),
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: "Side-by-side layout for displaying two callbacks",
      },
    },
  },
});
