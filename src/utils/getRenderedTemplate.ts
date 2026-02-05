import { readFile } from "node:fs/promises";
import path from "node:path";
import ejs from "ejs";
import { Liquid } from "liquidjs";
import logger from "../logger";
import getHTMLFromMarkdown from "./getHTMLfromMarkdown";

async function getTemplateContent(
  templatePath: string,
  includeWrapper = true,
): Promise<string> {
  // For layouts, we only want the template content without head/footer
  if (!includeWrapper) {
    const template = await readFile(templatePath, "utf-8");
    if (!template) {
      throw new Error(`Failed to read template file at ${templatePath}`);
    }
    return template;
  }

  const template = await readFile(templatePath, "utf-8");
  if (!template) {
    throw new Error(
      `Failed to read one or more template files: head, footer, or template at ${templatePath}`,
    );
  }

  return `${template}`;
}

async function getRenderedTemplate<T extends object>({
  template,
  data,
  runtimeConfig,
  includeWrapper = true,
}: {
  template: string;
  data: T;
  runtimeConfig?: object;
  includeWrapper?: boolean;
}): Promise<string> {
  if (
    template === "markdown" &&
    (!("markdown" in data) || typeof data.markdown !== "string")
  ) {
    throw new Error(
      "attempted to render the markdown template, but the data.markdown argument is missing or not a string",
    );
  }

  const isUsingLiquid = template.endsWith("liquid");
  const templateStr = await getTemplateContent(template, includeWrapper);

  try {
    if (isUsingLiquid) {
      // Configure liquidjs with proper paths when not including wrapper
      const engine = includeWrapper
        ? new Liquid()
        : new Liquid({
            root: path.resolve("./views/layouts"),
            partials: path.resolve("./views/partials"),
            extname: ".liquid",
          });
      logger.debug(
        { runtimeConfig, template },
        "Rendering liquid template with runtimeConfig",
      );
      return engine.parseAndRender(templateStr, {
        data,
        runtimeConfig,
      });
    }
    return ejs.render(
      templateStr,
      {
        runtimeConfig,
        data:
          template === "markdown" && "markdown" in data
            ? getHTMLFromMarkdown((data as { markdown: string }).markdown)
            : {
                data,
                runtimeConfig,
              },
      },
      {
        views: ["./views"],
        async: true,
      },
    );
  } catch (err) {
    logger.error(
      { err, template, data, runtimeConfig },
      "Error rendering template.",
    );

    throw err; // TODO this error is being swallowed
    // TODO should surface an error template with the contents of the error
  }
}

export default getRenderedTemplate;
