import { Liquid } from "liquidjs";
import calendarTemplate from "../src/callbacks/calendar/template.liquid?raw";
import redditTemplate from "../src/callbacks/reddit/template.liquid?raw";
import todoistTemplate from "../src/callbacks/todoist/template.liquid?raw";
import weatherTemplate from "../src/callbacks/weather/template.liquid?raw";
import yearProgressTemplate2Col from "../src/callbacks/year-progress/template.2-col.liquid?raw";
import yearProgressTemplate from "../src/callbacks/year-progress/template.liquid?raw";
import type { SupportedLayout } from "../src/types";
// Import the compiled Tailwind CSS the same way production reads it from disk
// (see getTailwindCss() in src/utils/getRenderedTemplate.ts) so head.liquid's
// `{% if tailwindCss != blank %}<style>...{% endif %}` block matches prod.
import tailwindCss from "../public/tailwind.css?raw";
// Import layout templates
import twoColLayout from "../views/layouts/2-col.liquid?raw";
import fullLayout from "../views/layouts/full.liquid?raw";
// Import partials
import footerPartial from "../views/partials/footer.liquid?raw";
import headPartial from "../views/partials/head.liquid?raw";

// Configure liquidjs engine with templates using parseFileSync approach
const engine = new Liquid({
  fs: {
    existsSync: () => true,
    readFileSync: (file: string) => {
      // Return partials when requested
      if (file.includes("head.liquid")) return headPartial;
      if (file.includes("footer.liquid")) return footerPartial;
      return "";
    },
    resolve: (root: string, file: string, ext: string) => file,
  } as any,
});

// Map of available callback templates
const callbackTemplates: Record<string, Record<SupportedLayout, string>> = {
  "year-progress": {
    full: yearProgressTemplate,
    "2-col": yearProgressTemplate2Col,
  },
  weather: { full: weatherTemplate, "2-col": weatherTemplate },
  calendar: { full: calendarTemplate, "2-col": calendarTemplate },
  todoist: { full: todoistTemplate, "2-col": todoistTemplate },
  reddit: { full: redditTemplate, "2-col": redditTemplate },
};

/**
 * Render a single callback with its template and data
 * Returns just the callback content (no head/footer)
 *
 * Mirrors the production render contract used by `#renderAsHTML` in
 * src/base-callbacks/base.ts, which always calls
 * `renderLiquidFile(template, { data, runtimeConfig })`. Templates reference
 * fields as `data.xxx` / `runtimeConfig.xxx`, so fixtures passed in here are
 * raw (unwrapped) and get wrapped in the same shape production uses.
 */
export function renderCallbackContent(
  callbackName: string,
  data: any,
  layout: SupportedLayout = "full",
  runtimeConfig: any = {},
): string {
  const template =
    callbackTemplates[callbackName]?.[layout] ??
    callbackTemplates[callbackName].full;
  if (!template) {
    throw new Error(`Template not found for callback: ${callbackName}`);
  }

  return engine.parseAndRenderSync(template, { data, runtimeConfig });
}

/**
 * Create a layout story renderer for use in Storybook
 */
export function createLayoutStoryRenderer(
  layout: SupportedLayout,
  callbacks: { name: string; data: any; runtimeConfig?: any }[],
) {
  return () => {
    try {
      if (layout === "full") {
        if (callbacks.length !== 1) {
          throw new Error("Full layout requires exactly 1 callback");
        }
        const content = renderCallbackContent(
          callbacks[0].name,
          callbacks[0].data,
          layout,
          callbacks[0].runtimeConfig,
        );
        return engine.parseAndRenderSync(fullLayout, { content, tailwindCss });
      }
      // 2-col layout
      if (callbacks.length !== 2) {
        throw new Error("2-col layout requires exactly 2 callbacks");
      }
      const content_left = renderCallbackContent(
        callbacks[0].name,
        callbacks[0].data,
        layout,
        callbacks[0].runtimeConfig,
      );
      const content_right = renderCallbackContent(
        callbacks[1].name,
        callbacks[1].data,
        layout,
        callbacks[1].runtimeConfig,
      );

      return engine.parseAndRenderSync(twoColLayout, {
        content_left,
        content_right,
        tailwindCss,
      });
    } catch (error) {
      console.error("Error rendering layout:", error);
      return `<div style="color: red; padding: 20px;">Error rendering layout: ${error instanceof Error ? error.message : String(error)}</div>`;
    }
  };
}
