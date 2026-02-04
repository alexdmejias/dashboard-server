import { Liquid } from "liquidjs";

// Import callback templates
import yearProgressTemplate from "../src/callbacks/year-progress/template.liquid?raw";
import weatherTemplate from "../src/callbacks/weather/template.liquid?raw";
import calendarTemplate from "../src/callbacks/calendar/template.liquid?raw";

// Import layout templates  
import fullLayout from "../views/layouts/full.liquid?raw";
import twoColLayout from "../views/layouts/2-col.liquid?raw";

const engine = new Liquid();

// Map of available callback templates
const callbackTemplates: Record<string, string> = {
  "year-progress": yearProgressTemplate,
  weather: weatherTemplate,
  calendar: calendarTemplate,
};

/**
 * Render a single callback with its template and data
 * Returns just the callback content (no head/footer)
 */
export function renderCallbackContent(callbackName: string, data: any): string {
  const template = callbackTemplates[callbackName];
  if (!template) {
    throw new Error(`Template not found for callback: ${callbackName}`);
  }

  // Render just the callback template with data
  return engine.parseAndRenderSync(template, { data });
}

/**
 * Create a layout story renderer for use in Storybook
 */
export function createLayoutStoryRenderer(
  layout: "full" | "2-col",
  callbacks: { name: string; data: any }[]
) {
  return () => {
    try {
      if (layout === "full") {
        if (callbacks.length !== 1) {
          throw new Error("Full layout requires exactly 1 callback");
        }
        const content = renderCallbackContent(callbacks[0].name, callbacks[0].data);
        return engine.parseAndRenderSync(fullLayout, { content });
      } else {
        if (callbacks.length !== 2) {
          throw new Error("2-col layout requires exactly 2 callbacks");
        }
        const content1 = renderCallbackContent(callbacks[0].name, callbacks[0].data);
        const content2 = renderCallbackContent(callbacks[1].name, callbacks[1].data);
        
        // Wrap each in a div and combine
        const combinedContent = `<div>${content1}</div>\n<div>${content2}</div>`;
        
        return engine.parseAndRenderSync(twoColLayout, { content: combinedContent });
      }
    } catch (error) {
      console.error("Error rendering layout:", error);
      return `<div style="color: red; padding: 20px;">Error rendering layout: ${error instanceof Error ? error.message : String(error)}</div>`;
    }
  };
}
