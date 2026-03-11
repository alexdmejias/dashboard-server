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
  const tailwindCss = await getTailwindCss();
  return engine.parseAndRender(templateStr, { ...data, tailwindCss });
}
