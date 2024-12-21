import showdown from "showdown";

function getHTMLFromMarkdown(data: string) {
  const classMap = {
    h1: "ui large header",
    h2: "ui medium header",
    h3: "ui medium header",
    ul: "ui list",
    li: "ui item",
    table: "inline-block",
    blockquote: "blockquote",
  } as const;

  const bindings = Object.keys(classMap).map((key) => ({
    type: "output",
    regex: new RegExp(`<${key}(.*)>`, "g"),
    replace: `<${key} class="${classMap[key as keyof typeof classMap]}" $1>`,
  }));

  const conv = new showdown.Converter({
    extensions: [...bindings],
    noHeaderId: true,
    tasklists: true,
    tables: true,
    strikethrough: true,
    emoji: true,
  });

  return conv.makeHtml(data);
}

export default getHTMLFromMarkdown;
