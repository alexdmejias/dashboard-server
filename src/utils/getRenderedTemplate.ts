import ejs from "ejs";

function getRenderedTemplate({
  template,
  data,
}: {
  template: string;
  data: Record<string, any> | any[];
}) {
  let rendered = "";
  ejs.renderFile(`./views/${template}.ejs`, { data }, {}, function (err, str) {
    if (err) throw err;
    rendered = str;
  });

  return rendered;
}

export default getRenderedTemplate;
