import { readFile } from "node:fs/promises";
import path from "node:path";
import { Liquid } from "liquidjs";
import logger from "../logger";
import { PROJECT_ROOT } from "./projectRoot";

// import getHTMLFromMarkdown from "./getHTMLfromMarkdown";

let cachedTailwindCss: string | null = null;

async function getTailwindCss(): Promise<string> {
  if (cachedTailwindCss !== null && process.env.NODE_ENV === "production") {
    return cachedTailwindCss;
  }
  const cssPath = path.join(PROJECT_ROOT, "public/tailwind.css");
  try {
    cachedTailwindCss = await readFile(cssPath, "utf-8");
  } catch (error) {
    logger.warn(
      { cssPath, error },
      "Tailwind CSS file not found; run `npm run build:css` to generate it",
    );
    cachedTailwindCss = "";
  }
  return cachedTailwindCss;
}

const PLUGINS_CSS_URL = "https://usetrmnl.com/css/latest/plugins.css";
let cachedPluginsCss: string | null = null;

async function getPluginsCss(): Promise<string> {
  if (cachedPluginsCss !== null && process.env.NODE_ENV === "production") {
    return cachedPluginsCss;
  }
  try {
    const response = await fetch(PLUGINS_CSS_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }
    cachedPluginsCss = await response.text();
  } catch (error) {
    logger.warn(
      { url: PLUGINS_CSS_URL, error },
      "Failed to fetch plugins CSS; falling back to empty string",
    );
    cachedPluginsCss = "";
  }
  return cachedPluginsCss;
}

export async function renderLiquidFile(
  templatePath: string,
  data: any,
): Promise<string> {
  const templateStr = await readFile(templatePath, "utf-8");
  if (!templateStr) {
    throw new Error(`Failed to read template file at ${templatePath}`);
  }

  const engine = new Liquid({
    root: path.join(PROJECT_ROOT, "views/layouts"),
    partials: path.join(PROJECT_ROOT, "views/partials"),
    extname: ".liquid",
  });
  logger.debug({ templatePath }, "Rendering liquid template with data");
  const [tailwindCss, pluginsCss] = await Promise.all([
    getTailwindCss(),
    getPluginsCss(),
  ]);
  return engine.parseAndRender(templateStr, { ...data, tailwindCss, pluginsCss });
}
