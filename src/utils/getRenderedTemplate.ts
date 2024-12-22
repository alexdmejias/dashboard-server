import ejs from "ejs";
import getHTMLFromMarkdown from "./getHTMLfromMarkdown";

function getRenderedTemplate<T extends object>({
  template,
  data,
}: {
  template: string;
  data: T;
}) {
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
    `./views/${template}.ejs`,
    {
      data:
        template === "markdown" && "markdown" in data
          ? getHTMLFromMarkdown((data as { markdown: string }).markdown)
          : data,
    },
    (err, str) => {
      if (err) throw err;
      rendered = str;
    }
  );

  return rendered;
}

export default getRenderedTemplate;
