import ejs from "ejs";
import { DataFromCallback } from "../types";

function getRenderedTemplate({
  template,
  data,
}: {
  template: string;
  data: DataFromCallback;
}) {
  let rendered = "";
  ejs.renderFile(`./views/${template}.ejs`, { data }, {}, function (err, str) {
    if (err) throw err;
    rendered = str;
  });

  return rendered;
}

export default getRenderedTemplate;
