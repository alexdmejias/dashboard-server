import ejs from "ejs";
import getHTMLFromMarkdown from "./getHTMLfromMarkdown";

async function getRenderedTemplate<T extends object = object>({
  template,
  data,
}: {
  template: string;
  data: T;
}) {
  if (template === "markdown") {
    if (!("markdown" in data)) {
      throw new Error("does not include markdown key");
    }

    if (typeof data.markdown !== "string") {
      throw new Error("markdown key is not a string");
    }
  }

  return ejs.renderFile(
    `./views/${template}.ejs`,
    {
      data:
        template === "markdown" &&
        "markdown" in data &&
        typeof data.markdown === "string"
          ? getHTMLFromMarkdown(data.markdown)
          : data,
    },
    {
      async: true,
    }
  );
}

export default getRenderedTemplate;
