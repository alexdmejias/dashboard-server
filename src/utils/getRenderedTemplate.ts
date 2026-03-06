import { readFile } from "node:fs/promises";
import path from "node:path";
import { Liquid } from "liquidjs";
import logger from "../logger";
import { PROJECT_ROOT } from "./projectRoot";

// import getHTMLFromMarkdown from "./getHTMLfromMarkdown";

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
  return engine.parseAndRender(templateStr, data);
}
