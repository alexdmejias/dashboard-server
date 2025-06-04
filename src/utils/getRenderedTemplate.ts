import ejs from "ejs";
import getHTMLFromMarkdown from "./getHTMLfromMarkdown";

function getRenderedTemplate<T extends object>({
  template,
  data,
}: {
  template: string;
  data: T;
}): string {
  let rendered = "";
  if (
    template === "markdown" &&
    (!("markdown" in data) || typeof data.markdown !== "string")
  ) {
    throw new Error(
      "attempted to render the markdown template, but the data.markdown argument is missing or not a string"
    );
  }

  ejs.renderFile(
    template,
    {
      data:
        template === "markdown" && "markdown" in data
          ? getHTMLFromMarkdown((data as { markdown: string }).markdown)
          : data,
    },
    {
      views: ["./views"],
    },
    (err, str) => {
      if (err) {
        console.error("Error rendering template:", err);
        throw err; // TODO this error is being swallowed
      }
      rendered = str;
    }
  );

  return rendered;
}

export default getRenderedTemplate;
