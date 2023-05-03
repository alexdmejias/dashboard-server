import ejs from "ejs";

function getRenderedTemplate<T>({
  template,
  data,
}: {
  template: string;
  data: T;
}) {
  let rendered = "";
  ejs.renderFile(`./views/${template}.ejs`, { data }, {}, function (err, str) {
    if (err) throw err;
    rendered = str;
  });

  return rendered;
}

export default getRenderedTemplate;
