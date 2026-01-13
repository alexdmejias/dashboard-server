import fs from "node:fs";
import path from "node:path";
import type { Meta, StoryObj } from "@storybook/html";
import ejs from "ejs";
import { Liquid } from "liquidjs";
import type CallbackBase from "../base-callbacks/base";

export type CallbackStoryConfig<T = any> = {
  CallbackClass: new (...args: any[]) => CallbackBase<T>;
  title: string;
  callbackPath: string;
  templatePath?: string;
  viewport?: { width: number; height: number };
  defaultRuntimeConfig?: Record<string, any>;
};

/**
 * Creates a Storybook Meta object with standard configuration for a callback
 */
export function createCallbackMeta<T>(
  config: CallbackStoryConfig<T>,
): Meta<any> {
  return {
    title: config.title,
    parameters: {
      layout: "fullscreen",
      viewport: config.viewport
        ? {
            defaultViewport: "custom",
            viewports: {
              custom: {
                name: "Custom",
                styles: {
                  width: `${config.viewport.width}px`,
                  height: `${config.viewport.height}px`,
                },
              },
            },
          }
        : undefined,
    },
  };
}

/**
 * Resolves the template path for a callback
 * Follows the same logic as CallbackBase#resolveTemplate
 */
function resolveTemplatePath(
  callbackPath: string,
  callbackName: string,
  templateOverride?: string,
): string {
  const extPreference = ["liquid", "ejs"];

  // 1) If a specific template was requested
  if (templateOverride) {
    for (const ext of extPreference) {
      if (
        templateOverride.endsWith(`.${ext}`) ||
        templateOverride.endsWith(ext)
      ) {
        const candidate = path.resolve(callbackPath, templateOverride);
        if (fs.existsSync(candidate)) return candidate;
        const viewsCandidate = path.resolve(
          process.cwd(),
          "views",
          templateOverride,
        );
        if (fs.existsSync(viewsCandidate)) return viewsCandidate;
      }
    }

    for (const ext of extPreference) {
      const viewsPath = path.resolve(
        process.cwd(),
        "views",
        `${templateOverride}.${ext}`,
      );
      if (fs.existsSync(viewsPath)) return viewsPath;
    }
  }

  // 2) Look for callback-local templates
  for (const ext of extPreference) {
    const local = path.resolve(callbackPath, `template.${ext}`);
    if (fs.existsSync(local)) return local;
  }

  // 3) Fallback to views/{name}.{ext}
  for (const ext of extPreference) {
    const viewsPath = path.resolve(
      process.cwd(),
      "views",
      `${callbackName}.${ext}`,
    );
    if (fs.existsSync(viewsPath)) return viewsPath;
  }

  // 4) Fallback to generic template
  const genericTemplatePath = path.resolve(process.cwd(), "views/generic.ejs");
  if (fs.existsSync(genericTemplatePath)) return genericTemplatePath;

  throw new Error(`No valid template found for callback: ${callbackName}`);
}

/**
 * Reads template files (head, footer, and main template) and combines them
 */
async function readTemplateFiles(
  templatePath: string,
): Promise<{ content: string; isLiquid: boolean }> {
  const isLiquid = templatePath.endsWith(".liquid");
  const ext = isLiquid ? "liquid" : "ejs";

  try {
    const [head, footer, template] = await Promise.all([
      fs.promises.readFile(
        path.resolve(process.cwd(), `views/partials/head.${ext}`),
        "utf-8",
      ),
      fs.promises.readFile(
        path.resolve(process.cwd(), `views/partials/footer.${ext}`),
        "utf-8",
      ),
      fs.promises.readFile(templatePath, "utf-8"),
    ]);

    return {
      content: `${head}\n${template}\n${footer}`,
      isLiquid,
    };
  } catch (error) {
    throw new Error(
      `Failed to read template files: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Renders a template with data and runtime config
 */
async function renderTemplate<T>(
  templatePath: string,
  data: T | { error: string },
  runtimeConfig?: Record<string, any>,
): Promise<string> {
  // Handle error state
  if (data && typeof data === "object" && "error" in data) {
    return `<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: red; font-size: 24px; padding: 20px; text-align: center;">${data.error}</div>`;
  }

  const { content, isLiquid } = await readTemplateFiles(templatePath);

  if (isLiquid) {
    const engine = new Liquid();
    return engine.parseAndRender(content, {
      data,
      runtimeConfig,
    });
  }

  return ejs.render(
    content,
    {
      data,
      runtimeConfig,
    },
    {
      views: [path.resolve(process.cwd(), "views")],
      async: true,
    },
  );
}

/**
 * Creates a story that uses static fixture data
 */
export function createSampleStory<T>(
  config: CallbackStoryConfig<T>,
  sampleData: T,
  runtimeConfig?: Record<string, any>,
): StoryObj {
  return {
    render: async () => {
      const callbackName = new config.CallbackClass().name;
      const templatePath = resolveTemplatePath(
        config.callbackPath,
        callbackName,
        config.templatePath,
      );

      const mergedRuntimeConfig = {
        ...config.defaultRuntimeConfig,
        ...runtimeConfig,
      };

      const html = await renderTemplate(
        templatePath,
        sampleData,
        mergedRuntimeConfig,
      );
      return html;
    },
  };
}

/**
 * Creates a story that calls the callback's getData() method
 */
export function createLiveStory<T>(
  config: CallbackStoryConfig<T>,
  callbackOptions?: any,
  runtimeConfig?: Record<string, any>,
): StoryObj {
  return {
    render: async () => {
      try {
        const callback = new config.CallbackClass(callbackOptions);
        const callbackName = callback.name;
        const templatePath = resolveTemplatePath(
          config.callbackPath,
          callbackName,
          config.templatePath,
        );

        const mergedRuntimeConfig = {
          ...config.defaultRuntimeConfig,
          ...runtimeConfig,
          ...callback.receivedConfig,
        };

        const data = await callback.getData(mergedRuntimeConfig);

        const html = await renderTemplate(
          templatePath,
          data,
          mergedRuntimeConfig,
        );
        return html;
      } catch (error) {
        return `<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: red; font-size: 24px; padding: 20px; text-align: center;">Error: ${error instanceof Error ? error.message : String(error)}</div>`;
      }
    },
  };
}

/**
 * Creates an interactive story with Storybook controls
 */
export function createInteractiveStory<T>(
  config: CallbackStoryConfig<T>,
  argTypes: Record<string, any>,
  dataBuilder: (args: any) => T,
  runtimeConfig?: Record<string, any>,
): StoryObj {
  return {
    argTypes,
    render: async (args) => {
      const callbackName = new config.CallbackClass().name;
      const templatePath = resolveTemplatePath(
        config.callbackPath,
        callbackName,
        config.templatePath,
      );

      const mergedRuntimeConfig = {
        ...config.defaultRuntimeConfig,
        ...runtimeConfig,
      };

      const data = dataBuilder(args);

      const html = await renderTemplate(
        templatePath,
        data,
        mergedRuntimeConfig,
      );
      return html;
    },
  };
}
