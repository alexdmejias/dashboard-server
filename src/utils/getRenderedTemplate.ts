import ejs from "ejs";

function getRenderedTemplate({
  name,
  data,
}: {
  name: string;
  data: Record<string, any> | any[];
}) {
  let rendered = "";
  ejs.renderFile(`./views/${name}.ejs`, { data }, {}, function (err, str) {
    if (err) throw err;
    rendered = str;
  });

  return rendered;
}

export default getRenderedTemplate;
