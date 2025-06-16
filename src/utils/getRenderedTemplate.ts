import { readFile } from "node:fs/promises";
import path from "node:path";
import ejs from "ejs";
import logger from "../logger";
import getHTMLFromMarkdown from "./getHTMLfromMarkdown";

async function getTemplateContent(templatePath: string): Promise<string> {
  const [head, footer, template] = await Promise.all([
    readFile(path.resolve("./views/partials/head.ejs"), "utf-8"),
    readFile(path.resolve("./views/partials/footer.ejs"), "utf-8"),
    readFile(templatePath, "utf-8"),
  ]);
  if (!head || !footer || !template) {
    throw new Error(
      `Failed to read one or more template files: head, footer, or template at ${templatePath}`,
    );
  }

  return `${head}\n${template}\n${footer}`;
}

async function getRenderedTemplate<T extends object>({
  template,
  data,
  runtimeConfig,
}: {
  template: string;
  data: T;
  runtimeConfig?: object;
}): Promise<string> {
  if (
    template === "markdown" &&
    (!("markdown" in data) || typeof data.markdown !== "string")
  ) {
    throw new Error(
      "attempted to render the markdown template, but the data.markdown argument is missing or not a string",
    );
  }

  const templateStr = await getTemplateContent(template);

  try {
    return ejs.render(
      templateStr,
      {
        runtimeConfig,
        data:
          template === "markdown" && "markdown" in data
            ? getHTMLFromMarkdown((data as { markdown: string }).markdown)
            : data,
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
  }
}

export default getRenderedTemplate;
