import { Liquid } from "liquidjs";
import calendarTemplate from "../src/callbacks/calendar/template.liquid?raw";
import weatherTemplate from "../src/callbacks/weather/template.liquid?raw";
import yearProgressTemplate2Col from "../src/callbacks/year-progress/template.2-col.liquid?raw";
import yearProgressTemplate from "../src/callbacks/year-progress/template.liquid?raw";
import type { SupportedLayout } from "../src/types";
// Import callback templates
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
};

/**
 * Render a single callback with its template and data
 * Returns just the callback content (no head/footer)
 */
export function renderCallbackContent(
  callbackName: string,
  data: any,
  layout: SupportedLayout = "full",
): string {
  const template =
    callbackTemplates[callbackName]?.[layout] ??
    callbackTemplates[callbackName].full;
  if (!template) {
    throw new Error(`Template not found for callback: ${callbackName}`);
  }

  // Render just the callback template with data
  return engine.parseAndRenderSync(template, data);
}

/**
 * Create a layout story renderer for use in Storybook
 */
export function createLayoutStoryRenderer(
  layout: SupportedLayout,
  callbacks: { name: string; data: any }[],
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
        );
        return engine.parseAndRenderSync(fullLayout, { content });
      }
      // 2-col layout
      if (callbacks.length !== 2) {
        throw new Error("2-col layout requires exactly 2 callbacks");
      }
      const content_left = renderCallbackContent(
        callbacks[0].name,
        callbacks[0].data,
        layout,
      );
      const content_right = renderCallbackContent(
        callbacks[1].name,
        callbacks[1].data,
        layout,
      );

      return engine.parseAndRenderSync(twoColLayout, {
        content_left,
        content_right,
      });
    } catch (error) {
      console.error("Error rendering layout:", error);
      return `<div style="color: red; padding: 20px;">Error rendering layout: ${error instanceof Error ? error.message : String(error)}</div>`;
    }
  };
}
